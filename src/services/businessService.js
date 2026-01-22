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

        const { data, error } = await supabase
            .from('venues')
            .select('*')
            .eq('owner_id', user.id);

        if (error) {
            console.error("Error fetching owned venues:", error);
            return [];
        }
        return data;
    },

    // Update business settings (hours, rules, booking link)
    // Note: For now we just update the venue struct directly. 
    // In future we might have separate business_settings jsonb column.
    updateVenueSettings: async (venueId, updates) => {
        const { data, error } = await supabase
            .from('venues')
            .update(updates)
            .eq('id', venueId)
            .select()
            .single();

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
    }
};
