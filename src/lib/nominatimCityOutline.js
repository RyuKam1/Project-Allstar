"use client";

const CACHE_PREFIX = "plan-v1|";
const outlineCache = new Map();
const inFlight = new Map();

function isAreaPolygonGeometry(geom) {
  return (
    geom &&
    (geom.type === "Polygon" || geom.type === "MultiPolygon") &&
    Array.isArray(geom.coordinates)
  );
}

function featureFromMatch(match, nameFallback) {
  if (!match?.geojson || !isAreaPolygonGeometry(match.geojson)) return null;
  return {
    type: "Feature",
    geometry: match.geojson,
    properties: {
      name: nameFallback || match.display_name || "City",
    },
  };
}

async function nominatimSearch(params) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "3");
  url.searchParams.set("polygon_geojson", "1");
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  });

  const response = await fetch(url.toString(), {
    // Browser-managed headers (User-Agent/Referer) identify client to Nominatim.
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

function pickPolygonFeature(results, placeName) {
  if (!results?.length) return null;
  const normalized = (placeName || "").toLowerCase();
  for (const row of results) {
    const feature = featureFromMatch(row, placeName);
    if (!feature) continue;
    if (!normalized) return feature;
    const hay = `${row.display_name || ""} ${row.name || ""}`.toLowerCase();
    if (hay.includes(normalized)) return feature;
  }
  for (const row of results) {
    const feature = featureFromMatch(row, placeName);
    if (feature) return feature;
  }
  return null;
}

export async function getCityOutline({
  cityName,
  countryCode,
  stateCode,
  lat,
  lng,
}) {
  const cc = countryCode ? String(countryCode).toLowerCase() : "";
  const key =
    `${CACHE_PREFIX}${cityName || ""}|${cc}|${stateCode || ""}|${lat}|${lng}`.toLowerCase();
  if (outlineCache.has(key)) {
    return outlineCache.get(key);
  }
  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const request = (async () => {
    let geoJSON = null;
    try {
      const queryParts = [cityName, countryCode].filter(Boolean);
      if (queryParts.length) {
        const params = { q: queryParts.join(", ") };
        if (cc.length === 2) params.countrycodes = cc;
        const rows = await nominatimSearch(params);
        geoJSON = pickPolygonFeature(rows, cityName);
      }
    } catch (error) {
      console.warn("City outline lookup failed.", error);
    }

    const circle =
      Number.isFinite(lat) && Number.isFinite(lng)
        ? {
            center: [lat, lng],
            radiusMeters: 14000,
          }
        : null;

    const result = { geoJSON, circle };
    outlineCache.set(key, result);
    inFlight.delete(key);
    return result;
  })();

  inFlight.set(key, request);
  return request;
}
