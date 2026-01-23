import { supabase } from "@/lib/supabaseClient";

export const businessService = {

    // Submit a claim request for either an Official Venue or Community Location
    claimVenue: async (venueId, claimData, type = 'business') => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to claim a venue");

        // Prepare payload based on type
        const payload = {
            requester_id: user.id,
            business_name: claimData.businessName,
            contact_email: claimData.contactEmail,
            contact_phone: claimData.contactPhone,
            status: 'pending'
        };

        if (type === 'community') {
            payload.community_location_id = venueId;
            payload.venue_id = null; // Explicitly null
        } else {
            payload.venue_id = venueId;
            payload.community_location_id = null; // Explicitly null
        }

        const { data, error } = await supabase
            .from('claim_requests')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Get venues owned by the current user (Official and Community)
    getOwnedVenues: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: official, error: officialError } = await supabase
            .from('venues')
            .select('*')
            .eq('owner_id', user.id);

        if (officialError) console.error("Error fetching owned official venues:", officialError);

        const { data: community, error: communityError } = await supabase
            .from('community_locations')
            .select('*')
            .eq('created_by', user.id)
            .eq('status', 'active'); // Assuming we only want active ones

        if (communityError) console.error("Error fetching owned community venues:", communityError);

        // Normalize structure if needed, or just return both mixed
        // For dashboard consistency, we might want to map them to a common shape
        const officialMapped = (official || []).map(v => ({ ...v, type: 'business', isBusiness: true }));
        const communityMapped = (community || []).map(v => ({ ...v, type: 'community', isBusiness: false, venue_id: v.id })); // dashboard uses venue_id key sometimes

        return [...officialMapped, ...communityMapped];
    },

    // Update business settings (hours, rules, booking link)
    // Note: For now we just update the venue struct directly. 
    // In future we might have separate business_settings jsonb column.
    updateVenueSettings: async (venueId, updates) => {
        // Try venues first
        const { data, error } = await supabase
            .from('venues')
            .update(updates)
            .eq('id', venueId)
            .select()
            .single();
        
        if (!error) return data;

        // If not found or error, try community_locations
        // Note: Community locations might have different columns. 
        // This generic update might fail if columns don't match. 
        // For now, we assume this is mostly for 'venues' table.
        // If we strictly separate them, we should pass type here too.
        if (error) throw error; 
        return data; 
    },

    // Create a new business venue
    createBusinessVenue: async (venueData) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in");

        // Insert into venues with owner_id
        const { data, error } = await supabase
            .from('venues')
            .insert({
                name: venueData.name,
                description: venueData.description,
                sport: venueData.sports[0], // Schema has single sport currently, or use type. We'll pick first.
                amenities: venueData.sports, // Store extra sports in amenities for now or need schema update.
                coordinates: [venueData.lat, venueData.lng],
                location: "Custom Location",
                owner_id: user.id,
                gallery: []
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Admin: Get All Claims (Parallel Fetch Pattern)
    // We use this pattern instead of native joins to ensure stability regardless of API Schema Caching.
    getAllClaims: async () => {
        // 1. Fetch Claims
        const { data: claims, error } = await supabase
            .from('claim_requests')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw new Error(error.message);
        if (!claims || claims.length === 0) return [];

        // 2. Extract IDs for batch fetching
        const requesterIds = [...new Set(claims.map(c => c.requester_id).filter(Boolean))];
        const officialVenueIds = [...new Set(claims.map(c => c.venue_id).filter(Boolean))];
        const communityVenueIds = [...new Set(claims.map(c => c.community_location_id).filter(Boolean))];

        // 3. Parallel Fetch
        const results = await Promise.all([
            requesterIds.length > 0 ? supabase.from('profiles').select('id, name, email, avatar').in('id', requesterIds) : { data: [] },
            officialVenueIds.length > 0 ? supabase.from('venues').select('id, name').in('id', officialVenueIds) : { data: [] },
            communityVenueIds.length > 0 ? supabase.from('community_locations').select('id, name').in('id', communityVenueIds) : { data: [] }
        ]);

        const profiles = results[0].data || [];
        const officialVenues = results[1].data || [];
        const communityVenues = results[2].data || [];

        // 4. Merge Data
        return claims.map(claim => {
            const profile = profiles.find(p => p.id === claim.requester_id);
            let venue = null;
            if (claim.venue_id) {
                venue = officialVenues.find(v => v.id === claim.venue_id);
            } else if (claim.community_location_id) {
                venue = communityVenues.find(v => v.id === claim.community_location_id);
            }
            
            return {
                ...claim,
                profile: profile || { name: 'Unknown', email: 'N/A' },
                venue: venue || { name: 'Unknown Venue' }
            };
        });
    },

    // Admin: Resolve Claim (Approve/Reject)
    resolveClaim: async (claimId, status) => {
        // 1. Update Claim Status
        // Remove .single() to avoid "Cannot coerce" error if RLS lets us see duplicates or something weird
        const { data, error } = await supabase
            .from('claim_requests')
            .update({ status })
            .eq('id', claimId)
            .select();
        
        if (error) throw new Error(error.message);
        const claim = data?.[0];
        if (!claim) throw new Error("Claim not found or update failed");

        // 2. If Approved, transfer ownership
        if (status === 'approved') {
            
            // Check if it's an Official Venue
            if (claim.venue_id) {
                const { error: venueError } = await supabase
                    .from('venues')
                    .update({ owner_id: claim.requester_id })
                    .eq('id', claim.venue_id);
                
                if (venueError) throw new Error("Failed to transfer official venue ownership: " + venueError.message);
            } 
            // Check if it's a Community Location
            else if (claim.community_location_id) {
                const { error: commError } = await supabase
                    .from('community_locations')
                    .update({ created_by: claim.requester_id }) // Transfer ownership by changing creator
                    .eq('id', claim.community_location_id);
                
                if (commError) throw new Error("Failed to transfer community location ownership: " + commError.message);
            }
            else {
                console.warn("Claim approved but no target venue found in request.");
            }

            // Also upgrade user role to 'business' if not already
            // This is a "nice to have" automation
            await supabase
                .from('profiles')
                .update({ role: 'business' })
                .eq('id', claim.requester_id);
        }

        return claim;
    }
};
