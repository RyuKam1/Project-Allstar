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
    maxSizeMB: 0.5, // Max size 0.5MB
    maxWidthOrHeight: 1200, // Max width/height
    useWebWorker: true,
    fileType: 'image/jpeg', // Force convert to JPEG for better compression
    initialQuality: 0.7
  };

  const options = { ...defaultOptions, ...optionsOverride };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Fallback: return original file if compression fails
    return file;
  }
}

/**
 * Compresses and uploads an image to Supabase Storage.
 * @param {File} file - The image file.
 * @param {string} bucket - Storage bucket name.
 * @param {string} folder - Folder path within bucket.
 * @returns {Promise<string|null>} - Public URL of uploaded image or null.
 */
export async function uploadCompressedImage(file, bucket, folder) {
  try {
    // 1. Compress
    const compressedFile = await compressImage(file);

    // 2. Upload
    const fileExt = compressedFile.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    // Upload using standard File body (works best with Supabase client)
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, compressedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
        throw error;
    }

    // 3. Get URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    return null;
  }
}
