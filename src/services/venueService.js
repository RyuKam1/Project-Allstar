import { supabase } from "@/lib/supabaseClient";
import { isPlaceholderVenueName, filterPlaceholderVenues } from "@/lib/placeholderVenues";
import { userInteractionService } from "./userInteractionService";
import { sanitizeLikeTerm, sanitizeText } from "@/lib/security/inputSanitizer";

function uniqueById(rows = []) {
  const seen = new Set();
  return rows.filter((row) => {
    if (row?.id == null || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

async function ilikeVenueSearch(pattern, columns) {
  const rows = [];

  for (const column of columns) {
    const { data, error } = await supabase
      .from("venues")
      .select("*")
      .ilike(column, pattern)
      .limit(20);

    if (error) {
      if (error.code === "42703") continue;
      throw error;
    }

    rows.push(...(data || []));
  }

  return rows;
}

let getAllVenuesInFlight = null;
let getAllVenuesCache = null;
let getAllVenuesCacheAt = 0;
const VENUE_LIST_CACHE_TTL_MS = 15000;

async function resolveVenueImageUrl(venueId, imageInput) {
  const normalizedInput = typeof imageInput === "string" ? imageInput.trim() : "";
  if (!normalizedInput) {
    throw new Error("Image is required");
  }

  if (/^https?:\/\//i.test(normalizedInput)) {
    return sanitizeText(normalizedInput, 2000);
  }

  if (!normalizedInput.startsWith("data:image/")) {
    throw new Error("Unsupported image format");
  }

  const response = await fetch(normalizedInput);
  const blob = await response.blob();
  const extension = blob.type?.includes("png") ? "png" : "jpg";
  const objectPath = `venues/${venueId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;
  const { error } = await supabase.storage
    .from("allstar-assets")
    .upload(objectPath, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: false,
      cacheControl: "3600",
    });

  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("allstar-assets").getPublicUrl(objectPath);
  return data?.publicUrl || null;
}

export const venueService = {
  // Get all venues (now from Supabase)
  getAllVenues: async () => {
    if (getAllVenuesCache && (Date.now() - getAllVenuesCacheAt) < VENUE_LIST_CACHE_TTL_MS) {
      return getAllVenuesCache;
    }
    if (getAllVenuesInFlight) return getAllVenuesInFlight;
    getAllVenuesInFlight = (async () => {
    // Fetch from DB
    const { data: venues, error } = await supabase
      .from('venues')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error("Error fetching venues:", error);
      throw error;
    }

    const filtered = filterPlaceholderVenues(venues || []);
    return filtered;
    })();

    try {
      const data = await getAllVenuesInFlight;
      getAllVenuesCache = data;
      getAllVenuesCacheAt = Date.now();
      return data;
    } finally {
      getAllVenuesInFlight = null;
    }
  },

  searchVenues: async (query) => {
    const safeQuery = sanitizeLikeTerm(query, 80);
    if (!safeQuery) return [];

    const pattern = `%${safeQuery}%`;
    const rows = uniqueById(
      await ilikeVenueSearch(pattern, ["name", "address", "description", "location", "sport"]),
    );

    const needle = safeQuery.toLowerCase();
    return filterPlaceholderVenues(rows).filter((venue) => {
      const haystack = [
        venue.name,
        venue.address,
        venue.description,
        typeof venue.location === "string" ? venue.location : "",
        venue.sport,
        ...(Array.isArray(venue.sports) ? venue.sports : []),
        ...(Array.isArray(venue.amenities) ? venue.amenities : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  },

  // Get single venue
  getVenueById: async (id) => {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    if (isPlaceholderVenueName(data?.name)) return null;
    return data;
  },

  // Upload/Update Venue Image
  uploadVenueImage: async (venueId, base64Image) => {
    const imageUrl = await resolveVenueImageUrl(venueId, base64Image);
    const { data: venue } = await supabase.from('venues').select('gallery').eq('id', venueId).single();
    const currentGallery = venue?.gallery || [];
    const newGallery = [...currentGallery, imageUrl].filter(Boolean);

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

  // Admin: Delete Venue
  deleteVenue: async (id) => {
    const { error } = await supabase.from('venues').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Admin: Update Venue
  updateVenue: async (id, updates) => {
    const { data, error } = await supabase.from('venues').update(updates).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
};
