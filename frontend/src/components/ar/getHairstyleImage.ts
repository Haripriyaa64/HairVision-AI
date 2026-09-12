"use client";

/**
 * HairVision AI
 * ------------------------------------------------------------
 * Resolves a hairstyle image from the hairstyle object returned
 * by the backend.
 *
 * IMPORTANT:
 * We DO NOT hardcode hairstyle IDs here.
 *
 * Images are physically stored in:
 *
 *   frontend/public/hairstyles/
 *
 * Next.js serves that folder at:
 *
 *   /hairstyles/<filename>
 *
 * Therefore the backend hairstyle object should contain one of:
 *
 *   image
 *   image_path
 *   reference_image
 *   filename
 *
 * Example:
 *
 * {
 *   "id": "women-wavy-layers",
 *   "name": "Soft Wavy Layers",
 *   "image": "soft-wavy-layers.png"
 * }
 *
 * becomes:
 *
 *   /hairstyles/soft-wavy-layers.png
 * ------------------------------------------------------------
 */

export interface HairstyleImageSource {
  id?: string | null;
  name?: string | null;

  image?: string | null;
  image_path?: string | null;
  reference_image?: string | null;
  filename?: string | null;
}

/**
 * Normalize a stored image value into a browser URL.
 */
function normalizeImageUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  // External image URL
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  // Already an absolute frontend path
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  // Already contains the public hairstyle folder
  if (
    trimmed.startsWith("hairstyles/") ||
    trimmed.startsWith("hairstyles\\")
  ) {
    return `/${trimmed.replace(/\\/g, "/")}`;
  }

  // Windows path or backend path such as:
  //
  // frontend/public/hairstyles/soft-layers.png
  //
  // We only want the filename portion.
  const normalizedPath = trimmed.replace(/\\/g, "/");

  if (normalizedPath.includes("/")) {
    const filename =
      normalizedPath.split("/").pop() || "";

    if (filename) {
      return `/hairstyles/${encodeURIComponent(filename)}`;
    }
  }

  // Plain filename
  return `/hairstyles/${encodeURIComponent(trimmed)}`;
}

/**
 * Get the image URL directly from the hairstyle data.
 *
 * Priority:
 *
 * 1. image
 * 2. image_path
 * 3. reference_image
 * 4. filename
 *
 * There is intentionally NO:
 *
 *   /hairstyles/${style.id}.png
 *
 * fallback.
 *
 * This prevents the old 404 problem where an ID such as
 * "women-wavy-layers" was incorrectly treated as a filename.
 */
export function getHairstyleImage(
  style: HairstyleImageSource | null | undefined
): string | null {
  if (!style) {
    return null;
  }

  const possibleSources = [
    style.image,
    style.image_path,
    style.reference_image,
    style.filename,
  ];

  for (const source of possibleSources) {
    if (
      typeof source !== "string" ||
      !source.trim()
    ) {
      continue;
    }

    const url = normalizeImageUrl(source);

    if (url) {
      return url;
    }
  }

  // IMPORTANT:
  //
  // Do NOT guess the filename from style.id.
  //
  // If the backend does not provide an image filename,
  // returning null allows the UI to show a proper missing-image
  // state instead of generating a 404 request.
  return null;
}

/**
 * Default export.
 *
 * Your existing components can continue using:
 *
 *   import getStyleImage from "@/components/ar/getHairstyleImage";
 *
 * and:
 *
 *   getStyleImage(style)
 */
export default getHairstyleImage;