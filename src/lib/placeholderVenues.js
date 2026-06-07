export const PLACEHOLDER_VENUE_NAMES = [
  "Thunderdome Arena",
  "Iron Pump Gym",
  "Greenfield Soccer Park",
  "Sky Court Tennis",
  "City Hoop Park",
  "Riverside Volleyball Sand",
  "Grand Slam Batting Cages",
  "AquaCenter Pool",
  "Maplewood Community Park",
  "Sunset Street Courts",
  "Lakeside Run Trail",
  "Veteran's Memorial Field",
  "Eastside Skate Park"
];

const placeholderVenueSet = new Set(PLACEHOLDER_VENUE_NAMES.map((name) => name.toLowerCase()));

export const isPlaceholderVenueName = (name) => {
  if (!name || typeof name !== "string") return false;
  return placeholderVenueSet.has(name.trim().toLowerCase());
};

export function filterPlaceholderVenues(venues = []) {
  return venues.filter((venue) => !isPlaceholderVenueName(venue?.name));
}

export function isPlaceholderSearchResult(result) {
  if (!result || typeof result !== "object") return false;
  return isPlaceholderVenueName(result.title) || isPlaceholderVenueName(result.name);
}

export function filterPlaceholderSearchResults(results = []) {
  return results.filter((result) => !isPlaceholderSearchResult(result));
}
