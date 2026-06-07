import { supabase } from "@/lib/supabaseClient";
import { PLACEHOLDER_VENUE_NAMES } from "@/lib/placeholderVenues";
import {
  deleteStorageObjects,
  extractObjectKeyFromUrl,
} from "@/lib/storageImages";

function collectObjectKey(urlOrKey) {
  if (!urlOrKey || typeof urlOrKey !== "string") return null;
  if (!urlOrKey.includes("/") && !urlOrKey.startsWith("http")) {
    return urlOrKey;
  }
  return extractObjectKeyFromUrl(urlOrKey);
}

export const placeholderVenueCleanupService = {
  cleanup: async () => {
    const { data: venues, error: fetchError } = await supabase
      .from("venues")
      .select("id, name, image, gallery")
      .in("name", PLACEHOLDER_VENUE_NAMES);

    if (fetchError) throw new Error(fetchError.message);

    if (!venues || venues.length === 0) {
      return {
        matchedVenues: 0,
        deletedVenues: 0,
        deletedLocationImages: 0,
        storage: { attempted: 0, deleted: 0, failed: 0, errors: [] },
        venueNames: []
      };
    }

    const venueIds = venues.map((v) => v.id);
    const venueNames = venues.map((v) => v.name);

    const imageUrls = [];
    for (const venue of venues) {
      if (venue.image) imageUrls.push(venue.image);
      if (Array.isArray(venue.gallery)) {
        for (const item of venue.gallery) {
          if (typeof item === "string" && item.trim()) imageUrls.push(item);
        }
      }
    }

    const objectPaths = new Set(
      imageUrls.map((url) => collectObjectKey(url)).filter(Boolean)
    );

    const { data: locationImageRows } = await supabase
      .from("location_images")
      .select("object_key, storage_bucket, image_url")
      .in("location_id", venueIds);

    for (const row of locationImageRows || []) {
      const key = row.object_key || collectObjectKey(row.image_url);
      if (key) objectPaths.add(key);
    }

    const storage = await deleteStorageObjects([...objectPaths]);

    let deletedLocationImages = 0;
    for (const venueId of venueIds) {
      const { data, error } = await supabase
        .from("location_images")
        .delete()
        .eq("location_id", venueId)
        .select("id");

      if (error) {
        // Non-blocking cleanup path for schema type mismatches.
        continue;
      }
      deletedLocationImages += Array.isArray(data) ? data.length : 0;
    }

    const { data: deletedRows, error: deleteError } = await supabase
      .from("venues")
      .delete()
      .in("id", venueIds)
      .select("id");

    if (deleteError) throw new Error(deleteError.message);

    return {
      matchedVenues: venues.length,
      deletedVenues: Array.isArray(deletedRows) ? deletedRows.length : 0,
      deletedLocationImages,
      storage,
      venueNames
    };
  }
};
