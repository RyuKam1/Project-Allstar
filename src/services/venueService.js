import { venues as staticVenues } from "@/lib/venues";
import { userInteractionService } from "./userInteractionService";

const STORAGE_KEY = 'allstar_venue_updates';

export const venueService = {
  // Get all venues (merge static with local storage)
  getAllVenues: async () => {
    // Simulate network delay slightly
    await new Promise(resolve => setTimeout(resolve, 200));

    if (typeof window === 'undefined') return staticVenues;

    const storedUpdates = localStorage.getItem(STORAGE_KEY);
    const updates = storedUpdates ? JSON.parse(storedUpdates) : {};

    return staticVenues.map(venue => {
      const venueUpdates = updates[venue.id] || {};
      const merged = { ...venue, ...venueUpdates };

      // Ensure the default image (explicitly defined) is present in the gallery
      // Fallback to name-based if 'image' is missing (which shouldn't happen with new data)
      const defaultImage = venue.image || `/venues/${venue.name}.jpg`;

      if (!merged.gallery) {
        merged.gallery = [defaultImage];
      } else if (!merged.gallery.includes(defaultImage)) {
        merged.gallery = [defaultImage, ...merged.gallery];
      }

      return merged;
    });
  },

  // Get single venue
  getVenueById: async (id) => {
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
