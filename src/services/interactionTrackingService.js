import { supabase } from "@/lib/supabaseClient";

/**
 * Interaction Tracking Service
 * Tracks user engagement for weighted credibility system
 */
export const interactionTrackingService = {
    /**
     * Track a page visit
     * @param {string} locationId - Location ID
     * @param {string} locationType - 'community' or 'business'
     * @returns {Promise<boolean>} Success status
     */
    trackVisit: async (locationId, locationType) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false; // Don't track anonymous users

        try {
            const { error } = await supabase
                .from('location_interactions')
                .insert({
                    user_id: user.id,
                    location_id: locationId.toString(),
                    location_type: locationType,
                    interaction_type: 'visit'
                });

            if (error) {
                console.error('Failed to track visit:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error('Error tracking visit:', err);
            return false;
        }
    },

    /**
     * Track a play intent submission
     * @param {string} locationId - Location ID
     * @param {string} locationType - 'community' or 'business'
     * @returns {Promise<boolean>} Success status
     */
    trackPlayIntent: async (locationId, locationType) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        try {
            const { error } = await supabase
                .from('location_interactions')
                .insert({
                    user_id: user.id,
                    location_id: locationId.toString(),
                    location_type: locationType,
                    interaction_type: 'play_intent'
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
     * Track an image upload
     * @param {string} locationId - Location ID
     * @param {string} locationType - 'community' or 'business'
     * @returns {Promise<boolean>} Success status
     */
    trackImageUpload: async (locationId, locationType) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        try {
            const { error } = await supabase
                .from('location_interactions')
                .insert({
                    user_id: user.id,
                    location_id: locationId.toString(),
                    location_type: locationType,
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
     * Track an edit submission
     * @param {string} locationId - Location ID
     * @param {string} locationType - 'community' or 'business'
     * @returns {Promise<boolean>} Success status
     */
    trackEdit: async (locationId, locationType) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        try {
            const { error } = await supabase
                .from('location_interactions')
                .insert({
                    user_id: user.id,
                    location_id: locationId.toString(),
                    location_type: locationType,
                    interaction_type: 'edit'
                });

            if (error) {
                console.error('Failed to track edit:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error('Error tracking edit:', err);
            return false;
        }
    },

    /**
     * Track a review submission
     * @param {string} locationId - Location ID
     * @param {string} locationType - 'community' or 'business'
     * @returns {Promise<boolean>} Success status
     */
    trackReview: async (locationId, locationType) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        try {
            const { error } = await supabase
                .from('location_interactions')
                .insert({
                    user_id: user.id,
                    location_id: locationId.toString(),
                    location_type: locationType,
                    interaction_type: 'review'
                });

            if (error) {
                console.error('Failed to track review:', error);
                return false;
            }
            return true;
        } catch (err) {
            console.error('Error tracking review:', err);
            return false;
        }
    },

    /**
     * Get user's credibility weight for a location
     * @param {string} userId - User ID
     * @param {string} locationId - Location ID
     * @param {string} locationType - 'community' or 'business'
     * @returns {Promise<number>} Weight multiplier
     */
    getUserWeight: async (userId, locationId, locationType) => {
        try {
            const { data, error } = await supabase
                .rpc('calculate_user_location_weight', {
                    p_user_id: userId,
                    p_location_id: locationId.toString(),
                    p_location_type: locationType
                });

            if (error) {
                console.error('Error calculating weight:', error);
                return 1.0;
            }

            return data || 1.0;
        } catch (err) {
            console.error('Error getting user weight:', err);
            return 1.0;
        }
    },

    /**
     * Get all interactions for a user at a location
     * @param {string} userId - User ID
     * @param {string} locationId - Location ID
     * @param {string} locationType - 'community' or 'business'
     * @returns {Promise<Array>} Interaction history
     */
    getUserLocationInteractions: async (userId, locationId, locationType) => {
        try {
            const { data, error } = await supabase
                .from('location_interactions')
                .select('*')
                .eq('user_id', userId)
                .eq('location_id', locationId.toString())
                .eq('location_type', locationType)
                .order('created_at', { ascending: false });

            if (error) throw new Error(error.message);
            return data || [];
        } catch (err) {
            console.error('Error fetching interactions:', err);
            return [];
        }
    },

    /**
     * Get interaction summary for a user at a location
     * @param {string} userId - User ID
     * @param {string} locationId - Location ID
     * @param {string} locationType - 'community' or 'business'
     * @returns {Promise<Object>} Interaction counts by type
     */
    getInteractionSummary: async (userId, locationId, locationType) => {
        const interactions = await interactionTrackingService.getUserLocationInteractions(
            userId,
            locationId,
            locationType
        );

        const summary = {
            visits: 0,
            playIntents: 0,
            imageUploads: 0,
            edits: 0,
            reviews: 0,
            total: interactions.length
        };

        interactions.forEach(interaction => {
            switch (interaction.interaction_type) {
                case 'visit':
                    summary.visits++;
                    break;
                case 'play_intent':
                    summary.playIntents++;
                    break;
                case 'image_upload':
                    summary.imageUploads++;
                    break;
                case 'edit':
                    summary.edits++;
                    break;
                case 'review':
                    summary.reviews++;
                    break;
            }
        });

        return summary;
    }
};
