import imageCompression from 'browser-image-compression';
import { supabase } from './supabaseClient';

/**
 * Compresses an image file.
 * @param {File} file - The image file to compress.
 * @param {Object} optionsOverride - Override default compression options.
 * @returns {Promise<File>} - The compressed file.
 */
export async function compressImage(file, optionsOverride = {}) {
  const defaultOptions = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.7
  };

  const options = { ...defaultOptions, ...optionsOverride };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file;
  }
}

function buildObjectKey(folder, fileExt) {
  const token =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const safeFolder = String(folder || '').replace(/^\/+|\/+$/g, '');
  return `${safeFolder}/${token}.${fileExt}`;
}

/**
 * Compresses and uploads an image to Supabase Storage.
 * @param {File} file - The image file.
 * @param {string} bucket - Storage bucket name.
 * @param {string} folder - Folder path within bucket.
 * @returns {Promise<{ publicUrl: string, objectKey: string, bucket: string, mimeType: string, byteSize: number }|null>}
 */
export async function uploadCompressedImage(file, bucket, folder) {
  try {
    const compressedFile = await compressImage(file);
    const fileExt = compressedFile.type?.includes('png') ? 'png' : 'jpg';
    const objectKey = buildObjectKey(folder, fileExt);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(objectKey, compressedFile, {
        cacheControl: '31536000',
        upsert: false,
        contentType: compressedFile.type || 'image/jpeg',
      });

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(objectKey);

    return {
      objectKey,
      bucket,
      mimeType: compressedFile.type || 'image/jpeg',
      byteSize: compressedFile.size,
      publicUrl,
    };
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
}
