// Utility to randomize generic venues around a center point
export function randomizeVenues(venues, centerLat, centerLng, minRadiusKm = 0.2, maxRadiusKm = 20) {
  return venues.map(venue => {
    // Generate random distance and angle
    const r = (minRadiusKm + Math.random() * (maxRadiusKm - minRadiusKm)) / 111; // approx degrees per km
    const theta = Math.random() * 2 * Math.PI;

    const latOffset = r * Math.cos(theta);
    const lngOffset = r * Math.sin(theta) / Math.cos(centerLat * Math.PI / 180); // adjust for longitude 

    return {
      ...venue,
      coordinates: [centerLat + latOffset, centerLng + lngOffset]
    };
  });
}

export function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
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

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
