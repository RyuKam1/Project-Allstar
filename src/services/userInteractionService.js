import { supabase } from "@/lib/supabaseClient";

/**
 * User Interaction Service
 * Tracks user engagement with venues for review weighting algorithm
 */
export const userInteractionService = {
    /**
     * Track a page view for a venue
     * @param {number} venueId - The venue ID
     * @returns {Promise<boolean>} Success status
     */
    trackPageView: async (venueId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false; // Don't track anonymous users

        try {
            const { error } = await supabase
                .from('user_venue_interactions')
                .insert({
                    user_id: user.id,
                    venue_id: venueId,
                    interaction_type: 'page_view'
                });

            if (error) {
                console.error('Failed to track page view:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error('Error tracking page view:', err);
            return false;
        }
    },

    /**
     * Track a booking for a venue
     * @param {number} venueId - The venue ID
     * @returns {Promise<boolean>} Success status
     */
    trackBooking: async (venueId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to book");

        try {
            const { error } = await supabase
                .from('user_venue_interactions')
                .insert({
                    user_id: user.id,
                    venue_id: venueId,
                    interaction_type: 'booking'
                });

            if (error) {
                console.error('Failed to track booking:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error('Error tracking booking:', err);
            return false;
        }
    },

    /**
     * Track play intent
     * @param {number} venueId - The venue ID
     * @param {Date} date - The date of play
     * @returns {Promise<boolean>} Success status
     */
    trackPlayIntent: async (venueId, date) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to track intent");

        try {
            const { error } = await supabase
                .from('user_venue_interactions')
                .insert({
                    user_id: user.id,
                    venue_id: venueId,
                    interaction_type: 'play_intent',
                    interaction_data: { date: date.toISOString() }
                });

            if (error) {
                console.error('Failed to track play intent:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error('Error tracking play intent:', err);
            return false;
        }
    },

    /**
     * Track an image upload for a venue
     * @param {number} venueId - The venue ID
     * @returns {Promise<boolean>} Success status
     */
    trackImageUpload: async (venueId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to upload");

        try {
            const { error } = await supabase
                .from('user_venue_interactions')
                .insert({
                    user_id: user.id,
                    venue_id: venueId,
                    interaction_type: 'image_upload'
                });

            if (error) {
                console.error('Failed to track image upload:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error('Error tracking image upload:', err);
            return false;
        }
    },

    /**
     * Get user's interaction weight for a venue
     * @param {string} userId - User ID
     * @param {number} venueId - Venue ID
     * @returns {Promise<Object>} Interaction summary
     */
    getUserInteractionWeight: async (userId, venueId) => {
        try {
            const { data: interactions, error } = await supabase
                .from('user_venue_interactions')
                .select('interaction_type, created_at')
                .eq('user_id', userId)
                .eq('venue_id', venueId);

            if (error || !interactions) {
                return {
                    bookings: 0,
                    pageViews: 0,
                    imageUploads: 0,
                    totalWeight: 1.0
                };
            }

            const bookings = interactions.filter(i => i.interaction_type === 'booking').length;
            const pageViews = interactions.filter(i => i.interaction_type === 'page_view').length;
            const imageUploads = interactions.filter(i => i.interaction_type === 'image_upload').length;

            // Calculate total weight
            let weight = 1.0;
            if (bookings > 0) weight *= 3.0;
            if (pageViews >= 3) weight *= 1.5;
            if (imageUploads > 0) weight *= 2.0;

            return {
                bookings,
                pageViews,
                imageUploads,
                totalWeight: weight
            };
        } catch (err) {
            console.error('Error getting user interaction weight:', err);
            return {
                bookings: 0,
                pageViews: 0,
                imageUploads: 0,
                totalWeight: 1.0
            };
        }
    },

    /**
     * Get all interactions for a user across all venues
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of interactions
     */
    getUserInteractions: async (userId) => {
        try {
            const { data, error } = await supabase
                .from('user_venue_interactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw new Error(error.message);
            return data || [];
        } catch (err) {
            console.error('Error fetching user interactions:', err);
            return [];
        }
    }
};
