import { supabase } from "@/lib/supabaseClient";
import { venues as staticVenues } from "@/lib/venues";
import { userInteractionService } from "./userInteractionService";

export const venueService = {
  // Get all venues (now from Supabase)
  getAllVenues: async () => {
    // 1. Fetch from DB
    const { data: venues, error } = await supabase
      .from('venues')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error("Error fetching venues:", error);
      return staticVenues; // Fallback only on error
    }

    // 2. Auto-Seed if empty (First run)
    if (!venues || venues.length === 0) {
      console.log("Seeding venues...");
      await venueService.seedVenues();
      return staticVenues; // Return static for now, next refresh will have DB data
    }

    return venues;
  },

  // Get single venue
  getVenueById: async (id) => {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  },

  // Upload/Update Venue Image
  uploadVenueImage: async (venueId, base64Image) => {
    // Note: In a real app, we'd upload to Storage bucket and get URL.
    // For this migration, we'll assume we might store base64 or URL in 'gallery' array in DB?
    // Storing base64 in TEXT/ARRAY column is bad practice but fits the 'quick' scope if small.
    // BETTER: Use existing 'uploadImage' helper if we have one, or just update the record if it sends a URL.
    
    // For now, let's assume the frontend sends a URL (if uploaded elsewhere) or we skip the complex upload logic
    // and just update the gallery array in the DB row.
    
    const { data: venue } = await supabase.from('venues').select('gallery').eq('id', venueId).single();
    const currentGallery = venue?.gallery || [];
    const newGallery = [...currentGallery, base64Image]; // Warn: Base64 might be too huge for DB column

    const { data, error } = await supabase
      .from('venues')
      .update({ gallery: newGallery })
      .eq('id', venueId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Track interaction
    await userInteractionService.trackImageUpload(venueId);

    return data;
  },

  // Seed Function
  seedVenues: async () => {
    // Transform static venues to match DB schema if needed
    // Static venues have 'id' which is auto-generated in DB, so we might omit it or force it.
    // We'll omit 'id' to let DB generate unique IDs, or force it if we want consistency.
    const venuesToInsert = staticVenues.map(v => ({
      name: v.name,
      type: v.type,
      sport: v.sport,
      location: v.location,
      rating: v.rating,
      price: v.price,
      image: v.image,
      amenities: v.amenities,
      coordinates: v.coordinates,
      gallery: [v.image], // Initialize gallery
      description: "Community venue ready for action.",
      // owner_id: null // System owned
    }));

    const { error } = await supabase.from('venues').insert(venuesToInsert);
    if (error) console.error("Seeding error:", error);
  }
};
