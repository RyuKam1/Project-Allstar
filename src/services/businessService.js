import { supabase } from "@/lib/supabaseClient";

export const businessService = {

    // Submit a claim request for an existing community location
    claimVenue: async (venueId, claimData) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to claim a venue");

        const { data, error } = await supabase
            .from('claim_requests')
            .insert({
                venue_id: venueId,
                requester_id: user.id,
                business_name: claimData.businessName,
                contact_email: claimData.contactEmail,
                contact_phone: claimData.contactPhone,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Get venues owned by the current user
    getOwnedVenues: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Join with community_locations to get names and details
        const { data, error } = await supabase
            .from('business_venues')
            .select(`
        *,
        community_locations:venue_id (
          name,
          lat,
          lng,
          sports,
          description
        )
      `)
            .eq('business_owner_id', user.id);

        if (error) {
            console.error("Error fetching owned venues:", error);
            return [];
        }
        return data;
    },

    // Update business settings (hours, rules, booking link)
    updateVenueSettings: async (venueId, updates) => {
        // updates can contain: operating_hours, booking_config, custom_rules
        const { data, error } = await supabase
            .from('business_venues')
            .update(updates)
            .eq('venue_id', venueId) // Ensure we target by venue_id (which is unique)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Create a new business venue (creates community location + business record)
    createBusinessVenue: async (venueData) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in");

        // 1. Create the Community Location (Public view)
        const { data: locationData, error: locationError } = await supabase
            .from('community_locations')
            .insert({
                name: venueData.name,
                description: venueData.description,
                sports: venueData.sports, // Array of strings
                lat: venueData.lat,
                lng: venueData.lng,
                address: venueData.address || '',
                created_by: user.id // Originally created by this user
            })
            .select()
            .single();

        if (locationError) throw locationError;

        // 2. Create the Business Venue Record (Ownership & Settings)
        const { data: businessData, error: businessError } = await supabase
            .from('business_venues')
            .insert({
                venue_id: locationData.id,
                business_owner_id: user.id,
                status: 'verified', // Auto-verify since they created it
                booking_config: {
                    method: 'external_link',
                    url: '',
                    label: 'Book Now',
                    phone: ''
                }
            })
            .select()
            .single();

        if (businessError) {
            // Rollback: try to delete the location if business creation fails to avoid orphans
            // Note: Realistically this should be a Postgres function for true atomicity, but this suffices for MVP
            await supabase.from('community_locations').delete().eq('id', locationData.id);
            throw businessError;
        }

        return { ...businessData, community_locations: locationData };
    }
};
