/**
 * Cloudinary utilities for the website
 *
 * Images are uploaded/managed via the platform CMS and stored in Firestore.
 * This utility provides helpers for transforming URLs for optimized delivery.
 */

export const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "themodel-cloud";

/**
 * Transform a Cloudinary URL with optimization parameters
 */
export function cloudinaryUrl(
  url: string | undefined | null,
  options: {
    width?: number;
    height?: number;
    crop?: "fill" | "fit" | "scale" | "thumb" | "crop";
    gravity?: "auto" | "face" | "center";
    quality?: "auto" | number;
    format?: "auto" | "webp" | "avif" | "jpg" | "png";
  } = {}
): string | null {
  if (!url) return null;

  // Return as-is if not a Cloudinary URL
  if (!url.includes("res.cloudinary.com")) return url;

  const {
    width,
    height,
    crop = "fill",
    gravity = "auto",
    quality = "auto",
    format = "auto",
  } = options;

  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;

  const transforms: string[] = [];

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) {
    transforms.push(`c_${crop}`);
    transforms.push(`g_${gravity}`);
  }
  transforms.push(`q_${quality}`);
  transforms.push(`f_${format}`);

  return `${parts[0]}/upload/${transforms.join(",")}/${parts[1]}`;
}

/**
 * Get a responsive image srcSet for different screen sizes
 */
export function cloudinarySrcSet(
  url: string | undefined | null,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  if (!url) return "";

  return widths
    .map((w) => {
      const optimized = cloudinaryUrl(url, { width: w });
      return `${optimized} ${w}w`;
    })
    .join(", ");
}

/**
 * Get avatar/profile image with face detection
 */
export function cloudinaryAvatar(
  url: string | undefined | null,
  size: number = 100
): string | null {
  return cloudinaryUrl(url, {
    width: size,
    height: size,
    crop: "fill",
    gravity: "face",
  });
}

/**
 * Get hero/banner image optimized for large displays
 */
export function cloudinaryHero(
  url: string | undefined | null,
  width: number = 1920,
  height: number = 800
): string | null {
  return cloudinaryUrl(url, {
    width,
    height,
    crop: "fill",
    gravity: "auto",
  });
}
