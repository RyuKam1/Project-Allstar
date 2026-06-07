import { supabase } from '@/lib/supabaseClient';
import { filterPlaceholderSearchResults } from '@/lib/placeholderVenues';
import { venueService } from '@/services/venueService';
import { communityLocationService } from '@/services/communityLocationService';

function mapCommunityLocation(loc) {
  const sports = Array.isArray(loc.sports) ? loc.sports : [];
  const subtitleParts = [loc.address, ...sports].filter(Boolean);

  return {
    id: `community-${loc.id}`,
    url_path: `/locations/${loc.id}?type=community`,
    image: loc.image_url || loc.card_image_url || null,
    title: loc.name,
    type: 'Community Spot',
    subtitle: subtitleParts.join(' · ') || 'Community location',
  };
}

function mapBusinessVenue(venue) {
  const sports = Array.isArray(venue.sports) ? venue.sports : [];
  const locationText = typeof venue.location === 'string' ? venue.location : '';
  const subtitleParts = [venue.address || locationText, ...sports].filter(Boolean);

  return {
    id: `venue-${venue.id}`,
    url_path: `/locations/${venue.id}?type=business`,
    image: venue.gallery?.[0] || venue.image_url || venue.banner_image_url || null,
    title: venue.name,
    type: 'Official Venue',
    subtitle: subtitleParts.join(' · ') || 'Business venue',
  };
}

export async function searchVenues(query) {
  const [officialVenues, communityLocations] = await Promise.all([
    venueService.searchVenues(query),
    communityLocationService.searchLocations(query),
  ]);

  return [
    ...officialVenues.map(mapBusinessVenue),
    ...communityLocations.map(mapCommunityLocation),
  ];
}

function dedupeResults(results) {
  const seen = new Set();
  return results.filter((result) => {
    const key = result.url_path || result.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function runGlobalSearch(query, filterType) {
  const trimmed = (query || '').trim();
  if (!trimmed) return [];

  if (filterType === 'Venues') {
    return filterPlaceholderSearchResults(await searchVenues(trimmed)).slice(0, 20);
  }

  const venueResults = filterType === 'All' ? await searchVenues(trimmed) : [];

  const { data, error } = await supabase.rpc('search_all', {
    query: trimmed,
    filter_type: filterType,
  });

  if (error) throw error;

  const rpcResults = filterPlaceholderSearchResults(data || []);

  if (filterType === 'All') {
    return filterPlaceholderSearchResults(
      dedupeResults([...venueResults, ...rpcResults]),
    ).slice(0, 20);
  }

  return rpcResults;
}
