import imageCompression from "browser-image-compression";
import { supabase } from "./supabaseClient";
import {
  DEFAULT_STORAGE_BUCKET,
  extractObjectKeyFromUrl,
  generateShortObjectKey,
} from "./storageImageKeys";

export const COMMUNITY_IMAGE_MAX_COUNT = 3;
export const COMMUNITY_IMAGE_MAX_BYTES = 512 * 1024;
export const COMMUNITY_IMAGE_CACHE_CONTROL = "31536000";

export { DEFAULT_STORAGE_BUCKET, extractObjectKeyFromUrl, generateShortObjectKey } from "./storageImageKeys";

export function resolvePublicImageUrl(recordOrKey, bucket = DEFAULT_STORAGE_BUCKET) {
  if (!recordOrKey) return null;

  if (typeof recordOrKey === "string") {
    if (
      recordOrKey.startsWith("http") ||
      recordOrKey.startsWith("data:") ||
      recordOrKey.startsWith("/")
    ) {
      return recordOrKey;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(recordOrKey);
    return data?.publicUrl || null;
  }

  const key =
    recordOrKey.object_key ||
    recordOrKey.image_object_key ||
    extractObjectKeyFromUrl(recordOrKey.image_url);
  const resolvedBucket =
    recordOrKey.storage_bucket ||
    recordOrKey.image_storage_bucket ||
    bucket;

  if (key) {
    const { data } = supabase.storage.from(resolvedBucket).getPublicUrl(key);
    return data?.publicUrl || recordOrKey.image_url || null;
  }

  return recordOrKey.image_url || null;
}

export function enrichLocationImageRow(row) {
  if (!row) return row;
  return {
    ...row,
    image_url: resolvePublicImageUrl(row),
  };
}

export function enrichCommunityPostRow(row) {
  if (!row) return row;
  return {
    ...row,
    image_url: resolvePublicImageUrl({
      object_key: row.image_object_key,
      storage_bucket: row.image_storage_bucket,
      image_url: row.image_url,
    }),
  };
}

export async function compressCommunityImageFile(file) {
  const options = {
    maxSizeMB: 0.48,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.72,
  };

  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error("Community image compression failed:", error);
    return file;
  }
}

export async function dataUrlToFile(dataUrl, filename = "upload.jpg") {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

export async function uploadCompressedCommunityImage(input, { prefix = "c" } = {}) {
  let file;
  if (typeof input === "string" && input.startsWith("data:image/")) {
    file = await dataUrlToFile(input);
  } else if (input instanceof File) {
    file = input;
  } else if (input instanceof Blob) {
    file = new File([input], "upload.jpg", { type: input.type || "image/jpeg" });
  } else {
    throw new Error("Invalid image input");
  }

  const compressed = await compressCommunityImageFile(file);
  if (compressed.size > COMMUNITY_IMAGE_MAX_BYTES) {
    throw new Error("Image must be under 500KB after compression");
  }

  const objectKey = generateShortObjectKey(prefix);
  const mimeType = compressed.type || "image/jpeg";

  const { error } = await supabase.storage.from(DEFAULT_STORAGE_BUCKET).upload(objectKey, compressed, {
    contentType: mimeType,
    upsert: false,
    cacheControl: COMMUNITY_IMAGE_CACHE_CONTROL,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    objectKey,
    bucket: DEFAULT_STORAGE_BUCKET,
    mimeType,
    byteSize: compressed.size,
    publicUrl: resolvePublicImageUrl(objectKey),
  };
}

export async function deleteStorageObject(objectKey, bucket = DEFAULT_STORAGE_BUCKET) {
  if (!objectKey) return false;
  const { error } = await supabase.storage.from(bucket).remove([objectKey]);
  if (error) throw new Error(error.message);
  return true;
}

export async function deleteStorageObjects(objectKeys, bucket = DEFAULT_STORAGE_BUCKET) {
  const keys = [...new Set((objectKeys || []).filter(Boolean))];
  if (!keys.length) {
    return { attempted: 0, deleted: 0, failed: 0, errors: [] };
  }

  const chunkSize = 100;
  let deleted = 0;
  const errors = [];

  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    const { data, error } = await supabase.storage.from(bucket).remove(chunk);
    if (error) {
      errors.push(error.message || "Unknown storage deletion error");
      continue;
    }
    deleted += Array.isArray(data) ? data.length : 0;
  }

  return {
    attempted: keys.length,
    deleted,
    failed: Math.max(keys.length - deleted, 0),
    errors,
  };
}

export async function deleteLocationImageStorage(row) {
  if (!row) return;
  const objectKey = row.object_key || extractObjectKeyFromUrl(row.image_url);
  if (!objectKey) return;
  try {
    await deleteStorageObject(objectKey, row.storage_bucket || DEFAULT_STORAGE_BUCKET);
  } catch (err) {
    console.error("Failed to delete storage object:", err);
  }
}
