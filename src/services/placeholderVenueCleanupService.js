import { supabase } from "@/lib/supabaseClient";
import { PLACEHOLDER_VENUE_NAMES } from "@/lib/placeholderVenues";

const STORAGE_BUCKET = "allstar-assets";

function extractStoragePath(url) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("data:image/")) return null;

  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const signMarker = `/storage/v1/object/sign/${STORAGE_BUCKET}/`;

    if (parsed.pathname.includes(marker)) {
      return decodeURIComponent(parsed.pathname.split(marker)[1] || "").trim() || null;
    }

    if (parsed.pathname.includes(signMarker)) {
      return decodeURIComponent(parsed.pathname.split(signMarker)[1] || "").trim() || null;
    }

    return null;
  } catch {
    // Non-URL values are ignored intentionally.
    return null;
  }
}

async function deleteStorageObjects(paths) {
  if (!paths.length) {
    return { attempted: 0, deleted: 0, failed: 0, errors: [] };
  }

  const chunkSize = 100;
  let deleted = 0;
  const errors = [];

  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).remove(chunk);
    if (error) {
      errors.push(error.message || "Unknown storage deletion error");
      continue;
    }
    deleted += Array.isArray(data) ? data.length : 0;
  }

  return {
    attempted: paths.length,
    deleted,
    failed: Math.max(paths.length - deleted, 0),
    errors
  };
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

    const objectPaths = [...new Set(imageUrls.map(extractStoragePath).filter(Boolean))];
    const storage = await deleteStorageObjects(objectPaths);

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
