import { supabase } from '@/lib/supabaseClient';

import { venues as staticVenues } from "@/lib/venues";
import { userInteractionService } from "./userInteractionService";

const STORAGE_KEY = 'venue_updates';

export const venueService = {
  // Get all venues (merge Supabase + static/local)
  getAllVenues: async () => {
    // 1. Fetch from Supabase (Community Locations + Business Config)
    let dbVenues = [];
    try {
      // Step A: Get Locations
      const { data, error } = await supabase
        .from('community_locations')
        .select(`
          *,
          location_images (
            image_url
          )
        `)
        .eq('status', 'active');

      if (data && data.length > 0) {
        // Step B: Get Business Configs
        const locationIds = data.map(l => l.id);
        let businessConfigs = [];

        try {
          const response = await fetch('/api/venues/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ venueIds: locationIds })
          });

          if (response.ok) {
            const result = await response.json();
            businessConfigs = result.data || [];
          }
        } catch (err) {
          console.error("Error fetching configs:", err);
        }

        // Map for quick lookup
        const configMap = new Map();
        if (businessConfigs) {
          businessConfigs.forEach(b => configMap.set(b.venue_id, b));
        }

        dbVenues = data.map(loc => {
          // Map DB structure to App structure
          // Helper to safely get the single business venue record if strict 1:1, or find first
          const biz = configMap.get(loc.id);

          return {
            id: loc.id,
            name: loc.name,
            type: 'Community Court', // default or infer
            location: loc.address || 'Unknown Location',
            price: biz?.booking_config?.paymentType === 'Paid'
              ? `${biz.booking_config.price} ${biz.booking_config.priceUnit || ''}`
              : 'Free',
            image: loc.image_url || null, // Cover
            gallery: loc.location_images?.map(i => i.image_url) || [],
            coordinates: { lat: loc.lat, lng: loc.lng },
            amenities: biz?.booking_config?.amenities && biz.booking_config.amenities.length > 0
              ? biz.booking_config.amenities
              : (loc.sports || []),
            sports: loc.sports || [], // Keep sports separate if needed
            rating: 0, // Should come from reviews table ideally
            reviews: 0,
            description: loc.description,
            // Merge Business Config if exists
            operating_hours: biz?.operating_hours,
            bookingConfig: biz?.booking_config || { isBookable: false, paymentType: 'Free' },
            isDbVenue: true
          };
        });
      }
    } catch (err) {
      console.error("Failed to fetch venues from DB", err);
    }

    // 2. Fetch Static Mock Data (for demo/fallback)
    if (typeof window === 'undefined' && dbVenues.length === 0) return staticVenues;

    const storedUpdates = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const updates = storedUpdates ? JSON.parse(storedUpdates) : {};

    const processedStaticVenues = staticVenues.map(venue => {
      const venueUpdates = updates[venue.id] || {};
      const merged = { ...venue, ...venueUpdates };

      if (!merged.bookingConfig) {
        merged.bookingConfig = {
          isBookable: true,
          method: 'internal',
          url: '',
          phone: ''
        };
      }
      return merged;
    });

    // Merge DB venues and Static venues
    // UUIDs from DB vs Numeric IDs from static should not collide
    return [...dbVenues, ...processedStaticVenues];
  },

  // Get single venue
  getVenueById: async (id) => {
    // Optimization: Try to fetch specific ID from DB directly if it looks like a UUID
    // But for now, reusing getAllVenues for consistency of mapping logic is safer for MVP
    const venues = await venueService.getAllVenues();
    return venues.find(v => v.id.toString() === id.toString()) || null;
  },

  // Upload an image for a venue
  uploadVenueImage: async (venueId, base64Image) => {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate upload delay

    const storedUpdates = localStorage.getItem(STORAGE_KEY);
    const updates = storedUpdates ? JSON.parse(storedUpdates) : {};

    // Initialize updates for this venue if not exists
    if (!updates[venueId]) updates[venueId] = {};

    // Initialize gallery if not exists
    const currentGallery = updates[venueId].gallery || [];
    const newGallery = [...currentGallery, base64Image];

    // Update local storage
    updates[venueId] = {
      ...updates[venueId],
      gallery: newGallery
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));

    // Track image upload for review weighting
    await userInteractionService.trackImageUpload(venueId);

    // Return updated venue details
    return venueService.getVenueById(venueId);
  }
};
