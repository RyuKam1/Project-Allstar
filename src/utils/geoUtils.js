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
