import { supabase } from "@/lib/supabaseClient";
import { KM_PER_DEG_LAT } from "@/utils/geoUtils";
import { sanitizeLikeTerm, sanitizeText } from "@/lib/security/inputSanitizer";
import { getPublicProfilesMap } from "./publicProfileService";
import {
  COMMUNITY_IMAGE_MAX_COUNT,
  deleteLocationImageStorage,
  enrichLocationImageRow,
  uploadCompressedCommunityImage,
} from "@/lib/storageImages";

const LOCATION_IMAGE_SELECT =
  "id, location_id, object_key, storage_bucket, mime_type, byte_size, image_url, uploaded_by, created_at";

function uniqueById(rows = []) {
  const seen = new Set();
  return rows.filter((row) => {
    if (!row?.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function enrichImages(images = []) {
  return (images || []).map(enrichLocationImageRow);
}

async function getLocationImageCount(locationId) {
  const { count, error } = await supabase
    .from("location_images")
    .select("id", { count: "exact", head: true })
    .eq("location_id", locationId);

  if (error) throw new Error(error.message);
  return count || 0;
}

/**
 * Community Location Service
 * Handles user-added informal locations with reputation-based editing
 */
export const communityLocationService = {
  /**
   * Create a new community location
   */
  createLocation: async (lat, lng, name, description, address, sports, images = []) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to add a location");

    const safeName = sanitizeText(name, 120);
    const safeDescription = sanitizeText(description, 1200);
    const safeAddress = sanitizeText(address, 300);

    if (!safeName || safeName.length < 3) {
      throw new Error("Location name must be at least 3 characters");
    }
    if (!lat || !lng) {
      throw new Error("Location coordinates are required");
    }
    if (!sports || sports.length === 0) {
      throw new Error("Please select at least one sport");
    }
    if (images.length > COMMUNITY_IMAGE_MAX_COUNT) {
      throw new Error(`Maximum ${COMMUNITY_IMAGE_MAX_COUNT} images allowed`);
    }

    const { data: location, error } = await supabase
      .from("community_locations")
      .insert({
        lat,
        lng,
        name: safeName,
        description: safeDescription || null,
        address: safeAddress || null,
        sports,
        created_by: user.id,
        status: "active",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (images.length > 0) {
      await Promise.all(
        images.map((img) => communityLocationService.uploadImage(location.id, img)),
      );
    }

    return location;
  },

  getLocationById: async (locationId) => {
    const { data: location, error } = await supabase
      .from("community_locations")
      .select("*")
      .eq("id", locationId)
      .single();

    if (error) throw new Error(error.message);
    if (!location) return null;

    const { data: images } = await supabase
      .from("location_images")
      .select(LOCATION_IMAGE_SELECT)
      .eq("location_id", locationId)
      .order("created_at", { ascending: true });

    location.images = enrichImages(images || []);
    return location;
  },

  getNearbyLocations: async (lat, lng, radiusKm = 10) => {
    const cosLat = Math.max(1e-6, Math.cos((lat * Math.PI) / 180));
    const latDelta = radiusKm / KM_PER_DEG_LAT;
    const lngDelta = radiusKm / (KM_PER_DEG_LAT * cosLat);
    const minLat = Math.max(-90, lat - latDelta);
    const maxLat = Math.min(90, lat + latDelta);
    const minLng = Math.max(-180, lng - lngDelta);
    const maxLng = Math.min(180, lng + lngDelta);

    let query = supabase
      .from("community_locations")
      .select(`
        *,
        location_images (
          ${LOCATION_IMAGE_SELECT}
        )
      `)
      .gte("lat", minLat)
      .lte("lat", maxLat)
      .gte("lng", minLng)
      .lte("lng", maxLng)
      .eq("status", "active");

    if (radiusKm >= 1000) {
      query = query.limit(1000);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (
      data?.map((loc) => ({
        ...loc,
        images: enrichImages(loc.location_images),
      })) || []
    );
  },

  getLocationsByCity: async (cityName) => {
    const rawName = sanitizeLikeTerm(cityName, 80);
    const normalizedName = rawName.toLowerCase().replace(/['’]/g, "");
    const terms = [...new Set([rawName, normalizedName].filter(Boolean))];
    if (terms.length === 0) return [];

    const searchResults = await Promise.all(
      terms.map((term) =>
        supabase
          .from("community_locations")
          .select(`
            *,
            location_images (
              ${LOCATION_IMAGE_SELECT}
            )
          `)
          .ilike("address", `%${term}%`)
          .eq("status", "active")
          .limit(200),
      ),
    );

    for (const result of searchResults) {
      if (result.error) throw new Error(result.error.message);
    }

    const data = uniqueById(searchResults.flatMap((result) => result.data || []));

    return (
      data?.map((loc) => ({
        ...loc,
        images: enrichImages(loc.location_images),
      })) || []
    );
  },

  submitEdit: async (locationId, field, newValue) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to edit");

    const allowedFields = ["name", "description", "sports", "address"];
    if (!allowedFields.includes(field)) {
      throw new Error("Invalid field update");
    }

    const normalizedValue =
      typeof newValue === "string"
        ? sanitizeText(newValue, field === "description" ? 1200 : 300)
        : newValue;

    const { data: edit, error } = await supabase.rpc("submit_location_edit", {
      p_location_id: locationId,
      p_field: field,
      p_new_value: normalizedValue,
    });

    if (error) throw new Error(error.message);
    return edit;
  },

  uploadImage: async (locationId, imageInput) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to upload");

    const existingCount = await getLocationImageCount(locationId);
    if (existingCount >= COMMUNITY_IMAGE_MAX_COUNT) {
      throw new Error(`Maximum ${COMMUNITY_IMAGE_MAX_COUNT} images allowed per location`);
    }

    let uploadResult;
    if (typeof imageInput === "string" && /^https?:\/\//i.test(imageInput.trim())) {
      const legacyUrl = sanitizeText(imageInput, 2000);
      const { data, error } = await supabase
        .from("location_images")
        .insert({
          location_id: locationId,
          image_url: legacyUrl,
          uploaded_by: user.id,
        })
        .select(LOCATION_IMAGE_SELECT)
        .single();

      if (error) throw new Error(error.message);
      return enrichLocationImageRow(data);
    }

    uploadResult = await uploadCompressedCommunityImage(imageInput, { prefix: "c" });

    const { data, error } = await supabase
      .from("location_images")
      .insert({
        location_id: locationId,
        object_key: uploadResult.objectKey,
        storage_bucket: uploadResult.bucket,
        mime_type: uploadResult.mimeType,
        byte_size: uploadResult.byteSize,
        image_url: null,
        uploaded_by: user.id,
      })
      .select(LOCATION_IMAGE_SELECT)
      .single();

    if (error) {
      await deleteLocationImageStorage({
        object_key: uploadResult.objectKey,
        storage_bucket: uploadResult.bucket,
      });
      throw new Error(error.message);
    }

    return enrichLocationImageRow(data);
  },

  deleteLocationImage: async (imageId) => {
    const { data: row, error: fetchError } = await supabase
      .from("location_images")
      .select(LOCATION_IMAGE_SELECT)
      .eq("id", imageId)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    const { error } = await supabase.from("location_images").delete().eq("id", imageId);
    if (error) throw new Error(error.message);

    await deleteLocationImageStorage(row);
    return true;
  },

  getEditHistory: async (locationId) => {
    const { data, error } = await supabase
      .from("location_edits")
      .select("*")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    const profileMap = await getPublicProfilesMap((data || []).map((edit) => edit.user_id));
    return (data || []).map((edit) => ({
      ...edit,
      profiles: profileMap.get(edit.user_id) || null,
    }));
  },

  getUserWeight: async (userId, locationId) => {
    const { data, error } = await supabase.rpc("calculate_user_location_weight", {
      p_user_id: userId,
      p_location_id: locationId,
      p_location_type: "community",
    });

    if (error) {
      console.error("Error calculating weight:", error);
      return 1.0;
    }

    return data || 1.0;
  },

  searchLocations: async (query) => {
    const safeQuery = sanitizeLikeTerm(query, 80);
    if (!safeQuery) return [];

    const pattern = `%${safeQuery}%`;
    const searchColumns = ["name", "description", "address"];
    const searchResults = await Promise.all(
      searchColumns.map((column) =>
        supabase
          .from("community_locations")
          .select("*")
          .ilike(column, pattern)
          .or("status.eq.active,status.is.null")
          .limit(20),
      ),
    );

    const rows = [];
    for (const result of searchResults) {
      if (result.error) {
        if (result.error.code === "42703") continue;
        throw new Error(result.error.message);
      }
      rows.push(...(result.data || []));
    }

    const needle = safeQuery.toLowerCase();
    return uniqueById(rows).filter((loc) => {
      const haystack = [
        loc.name,
        loc.description,
        loc.address,
        ...(Array.isArray(loc.sports) ? loc.sports : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  },

  getPendingEdits: async (locationId) => {
    const { data, error } = await supabase
      .from("location_edits")
      .select("*")
      .eq("location_id", locationId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    const profileMap = await getPublicProfilesMap((data || []).map((edit) => edit.user_id));
    return (data || []).map((edit) => ({
      ...edit,
      profiles: profileMap.get(edit.user_id) || null,
    }));
  },

  processEdit: async (editId, decision) => {
    if (!["applied", "rejected"].includes(decision)) {
      throw new Error("Invalid decision");
    }

    const { error } = await supabase.rpc("process_location_edit", {
      p_edit_id: editId,
      p_decision: decision,
    });

    if (error) throw new Error(error.message);
    return true;
  },
};
