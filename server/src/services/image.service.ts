// ============================================================
// Image Service — Resize, Compress & Upload to Supabase Storage
// ============================================================

import sharp from "sharp";
import { supabaseAdmin } from "../lib/supabase";

const MAX_WIDTH = 1024;
const THUMB_WIDTH = 256;
const QUALITY = 80;

interface ProcessedImages {
  imageUrl: string;
  thumbnailUrl: string;
}

/**
 * Processes a wardrobe image:
 *   1. Resizes to max 1024px wide (maintains aspect ratio)
 *   2. Generates a 256px thumbnail
 *   3. Converts both to WebP for optimal size
 *   4. Uploads both to Supabase Storage
 *   5. Returns public URLs
 */
export async function processAndUploadWardrobeImage(
  fileBuffer: Buffer,
  userId: string,
  itemId: string
): Promise<ProcessedImages> {
  // Process main image
  const mainImage = await sharp(fileBuffer)
    .resize(MAX_WIDTH, null, {
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: QUALITY })
    .toBuffer();

  // Process thumbnail
  const thumbnail = await sharp(fileBuffer)
    .resize(THUMB_WIDTH, THUMB_WIDTH, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: 70 })
    .toBuffer();

  // Upload main image
  const mainPath = `${userId}/${itemId}/original.webp`;
  const { error: mainError } = await supabaseAdmin.storage
    .from("wardrobe-images")
    .upload(mainPath, mainImage, {
      contentType: "image/webp",
      upsert: true,
    });

  if (mainError) {
    throw new Error(`Failed to upload main image: ${mainError.message}`);
  }

  // Upload thumbnail
  const thumbPath = `${userId}/${itemId}/thumb.webp`;
  const { error: thumbError } = await supabaseAdmin.storage
    .from("wardrobe-images")
    .upload(thumbPath, thumbnail, {
      contentType: "image/webp",
      upsert: true,
    });

  if (thumbError) {
    throw new Error(`Failed to upload thumbnail: ${thumbError.message}`);
  }

  // Get public URLs
  const { data: mainUrl } = supabaseAdmin.storage
    .from("wardrobe-images")
    .getPublicUrl(mainPath);

  const { data: thumbUrl } = supabaseAdmin.storage
    .from("wardrobe-images")
    .getPublicUrl(thumbPath);

  return {
    imageUrl: mainUrl.publicUrl,
    thumbnailUrl: thumbUrl.publicUrl,
  };
}

/**
 * Deletes all images for a wardrobe item from Supabase Storage.
 */
export async function deleteWardrobeImages(
  userId: string,
  itemId: string
): Promise<void> {
  const filesToDelete = [
    `${userId}/${itemId}/original.webp`,
    `${userId}/${itemId}/thumb.webp`,
  ];

  const { error } = await supabaseAdmin.storage
    .from("wardrobe-images")
    .remove(filesToDelete);

  if (error) {
    console.error(`Failed to delete images for item ${itemId}:`, error.message);
  }
}
