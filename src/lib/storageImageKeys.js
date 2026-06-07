export const DEFAULT_STORAGE_BUCKET = "allstar-assets";

export function generateShortObjectKey(prefix = "c") {
  const token =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}/${token}.jpg`;
}

export function extractObjectKeyFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("data:")) return null;

  try {
    const parsed = new URL(url);
    const publicMarker = `/storage/v1/object/public/${DEFAULT_STORAGE_BUCKET}/`;
    const signMarker = `/storage/v1/object/sign/${DEFAULT_STORAGE_BUCKET}/`;

    let path = null;
    if (parsed.pathname.includes(publicMarker)) {
      path = parsed.pathname.split(publicMarker)[1];
    } else if (parsed.pathname.includes(signMarker)) {
      path = parsed.pathname.split(signMarker)[1];
    }

    if (!path) return null;
    return decodeURIComponent(path.split("?")[0]).trim() || null;
  } catch {
    return null;
  }
}
