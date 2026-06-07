/** Spherical Earth radius (km); same sphere as {@link getDistance}. */
export const EARTH_RADIUS_KM = 6371;

/** Mean km per degree latitude (~2πR/360 for Earth radius R km); aligns bbox prefilter with Haversine. */
export const KM_PER_DEG_LAT = (2 * Math.PI * EARTH_RADIUS_KM) / 360;

export function getDistance(lat1, lon1, lat2, lon2) {
  const R = EARTH_RADIUS_KM;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

/**
 * Closed ring of [lat, lng] on a sphere — true geodesic disk edge (unlike Leaflet L.circle, which is Mercator).
 * Matches ground distance used by {@link getDistance} for the same radius in meters.
 */
export function geodesicCircleLatLngs(lat, lng, radiusMeters, segments = 72) {
  const dKm = radiusMeters / 1000;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || dKm <= 0) return [];

  const δ = dKm / EARTH_RADIUS_KM;
  const φ1 = deg2rad(lat);
  const λ1 = deg2rad(lng);
  const ring = [];

  for (let i = 0; i <= segments; i++) {
    const θ = (i / segments) * 2 * Math.PI;
    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) +
        Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
    );
    const λ2 =
      λ1 +
      Math.atan2(
        Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
      );
    ring.push([(φ2 * 180) / Math.PI, (λ2 * 180) / Math.PI]);
  }
  return ring;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
