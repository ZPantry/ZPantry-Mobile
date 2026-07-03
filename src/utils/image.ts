export const FALLBACK_FOOD_IMAGE_URL = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80";

const knownBrokenImageUrls = new Set(["https://images.unsplash.com/photo-1546470427-e26264be0b0d"]);

export function normalizeRemoteImageUrl(value?: string | null) {
  const cleanUrl = value?.trim();
  if (!cleanUrl) return FALLBACK_FOOD_IMAGE_URL;

  const urlWithoutQuery = cleanUrl.split("?")[0].replace(/\/$/, "");
  if (knownBrokenImageUrls.has(urlWithoutQuery)) {
    return FALLBACK_FOOD_IMAGE_URL;
  }

  if (urlWithoutQuery.startsWith("https://images.unsplash.com/photo-") && !cleanUrl.includes("?")) {
    return `${cleanUrl}?auto=format&fit=crop&w=900&q=80`;
  }

  return cleanUrl;
}
