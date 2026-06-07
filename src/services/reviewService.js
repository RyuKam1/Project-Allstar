import { supabase } from "@/lib/supabaseClient";
import { interactionTrackingService } from "./interactionTrackingService";
import { getPublicProfilesMap } from "./publicProfileService";
import { sanitizeText } from "@/lib/security/inputSanitizer";

/**
 * Review Service
 * Handles reviews for both Community Locations and Business Venues
 */
export const reviewService = {
    /**
     * Submit a new review
     * @param {string} locationId - Location UUID or ID
     * @param {string} locationType - 'community' or 'business'
     * @param {number} rating - Star rating (1-5)
     * @param {string} comment - Review text
     * @param {Array<string>} images - Optional array of image URLs/base64
     * @param {string} playedSport - Optional sport the user played
     * @returns {Promise<Object>} The created review
     */
    submitReview: async (locationId, locationType, rating, comment, images = [], playedSport = null) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to submit a review");

        // Validate inputs
        const safeComment = sanitizeText(comment, 1500);
        if (rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5 stars");
        if (!safeComment || safeComment.length < 10) throw new Error("Review must be at least 10 characters");

        // Check if user already reviewed this location
        const { data: existingReview } = await supabase
            .from('venue_reviews')
            .select('id')
            .eq('location_id', locationId.toString())
            .eq('location_type', locationType)
            .eq('user_id', user.id)
            .single();

        if (existingReview) {
            throw new Error("You've already reviewed this location. You can edit your existing review.");
        }

        // Insert review
        const { data, error } = await supabase
            .from('venue_reviews')
            .insert({
                location_id: locationId.toString(),
                location_type: locationType,
                user_id: user.id,
                rating,
                comment: safeComment,
                images: images.length > 0 ? images : null,
                played_sport: playedSport
            })
            .select('*')
            .single();

        if (error) throw new Error(error.message);

        // Track the review interaction
        await interactionTrackingService.trackReview(locationId, locationType);

        // If they played, track a play intent retroactively?
        // Or just let the review weight logic handle it eventually via visits.
        // For now, simple interaction tracking is enough.

        const profileMap = await getPublicProfilesMap([data.user_id]);
        return {
            ...data,
            profiles: profileMap.get(data.user_id) || null
        };
    },

    /**
     * Get all reviews for a location with calculated weights
     * @param {string} locationId 
     * @param {string} locationType 
     */
    getReviews: async (locationId, locationType) => {
        const { data: reviews, error } = await supabase
            .from('venue_reviews')
            .select('*')
            .eq('location_id', locationId.toString())
            .eq('location_type', locationType)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        if (!reviews || reviews.length === 0) return [];

        const profileMap = await getPublicProfilesMap(reviews.map((review) => review.user_id));

        // Calculate weight for each review
        const reviewsWithWeights = await Promise.all(
            reviews.map(async (review) => {
                // Get base user weight for this location
                let weight = await interactionTrackingService.getUserWeight(
                    review.user_id,
                    locationId,
                    locationType
                );

                // Bonus for detailed reviews
                if (review.comment.length > 100) {
                    weight *= 1.3;
                }

                return {
                    ...review,
                    profiles: profileMap.get(review.user_id) || null,
                    _weight: weight // Internal field for sorting
                };
            })
        );

        // Sort by weight (highest first)
        reviewsWithWeights.sort((a, b) => b._weight - a._weight);

        return reviewsWithWeights;
    },

    /**
     * Get aggregate review statistics
     * @param {string} locationId 
     * @param {string} locationType 
     */
    getReviewStats: async (locationId, locationType) => {
        // Try to use the DB function first for efficiency
        const { data: avgRating, error: funcError } = await supabase
            .rpc('get_location_average_rating', {
                p_location_id: locationId.toString(),
                p_location_type: locationType
            });

        // Get count and distribution
        const { data: reviews, error } = await supabase
            .from('venue_reviews')
            .select('rating')
            .eq('location_id', locationId.toString())
            .eq('location_type', locationType);

        if (error) throw new Error(error.message);

        const totalReviews = reviews.length;
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach(r => {
            if (distribution[r.rating] !== undefined) distribution[r.rating]++;
        });

        // Use RPC result if available, otherwise 0
        const average = avgRating || 0;

        return {
            averageRating: Number(average),
            totalReviews,
            distribution
        };
    },

    /**
     * Delete a review
     */
    deleteReview: async (reviewId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in");

        const { error } = await supabase
            .from('venue_reviews')
            .delete()
            .eq('id', reviewId)
            .eq('user_id', user.id);

        if (error) throw new Error(error.message);
        return true;
    },

    /**
     * Update a review
     */
    updateReview: async (reviewId, rating, comment, images = [], playedSport = null) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in");

        // Validate
        const safeComment = sanitizeText(comment, 1500);
        if (rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5 stars");
        if (!safeComment || safeComment.length < 10) throw new Error("Review must be at least 10 characters");

        const { data, error } = await supabase
            .from('venue_reviews')
            .update({
                rating,
                comment: safeComment,
                images: images.length > 0 ? images : null,
                played_sport: playedSport,
                updated_at: new Date().toISOString()
            })
            .eq('id', reviewId)
            .eq('user_id', user.id)
            .select('*')
            .single();

        if (error) throw new Error(error.message);
        const profileMap = await getPublicProfilesMap([data.user_id]);
        return {
            ...data,
            profiles: profileMap.get(data.user_id) || null
        };
    },

    /**
     * Get user's review for a location
     */
    getUserReview: async (locationId, locationType) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('venue_reviews')
            .select('*')
            .eq('location_id', locationId.toString())
            .eq('location_type', locationType)
            .eq('user_id', user.id)
            .single();

        if (error) return null;
        const profileMap = await getPublicProfilesMap([data.user_id]);
        return {
            ...data,
            profiles: profileMap.get(data.user_id) || null
        };
    },

    /**
     * Report a review for moderation.
     */
    reportReview: async (reviewId, reason) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in");

        const safeReason = sanitizeText(reason, 1200);
        if (!safeReason || safeReason.length < 5) {
            throw new Error("Please provide a short reason");
        }

        const { error } = await supabase
            .from('review_reports')
            .upsert({
                review_id: reviewId,
                reporter_id: user.id,
                reason: safeReason,
                status: 'pending'
            }, { onConflict: 'review_id,reporter_id' });

        if (error) throw new Error(error.message);
        return true;
    }
};
