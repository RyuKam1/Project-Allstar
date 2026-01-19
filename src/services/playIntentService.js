import { supabase } from "@/lib/supabaseClient";

/**
 * Play Intent Service
 * Core social momentum feature - NOT a booking system
 * Language: "Play", "Join", "Going", "Activity" (avoid "book", "reserve", "slot")
 */
export const playIntentService = {
    /**
     * Create a play intent (signal when you're planning to play)
     * @param {string} locationId - Location ID (UUID for community, integer for business)
     * @param {string} locationType - 'community' or 'business'
     * @param {Date} intentTime - When you plan to play
     * @param {string} sport - Optional sport
     * @param {string} skillLevel - Optional skill level
     * @param {string} note - Optional short note
     * @returns {Promise<Object>} Created intent
     */
    createIntent: async (locationId, locationType, intentTime, sport = null, skillLevel = null, note = null) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to signal play intent");

        // Validate intent time is in the future
        if (new Date(intentTime) < new Date()) {
            throw new Error("Intent time must be in the future");
        }

        // Check if user already has an intent for this location around this time
        const existingIntent = await playIntentService.getUserIntentNearTime(
            locationId,
            locationType,
            intentTime
        );

        if (existingIntent) {
            throw new Error("You already have a play intent around this time");
        }

        const { data, error } = await supabase
            .from('play_intents')
            .insert({
                location_id: locationId.toString(),
                location_type: locationType,
                user_id: user.id,
                intent_time: intentTime,
                sport,
                skill_level: skillLevel,
                note: note?.trim() || null
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Get active (non-expired) play intents for a location
     * @param {string} locationId - Location ID
     * @param {string} locationType - 'community' or 'business'
     * @returns {Promise<Array>} Active intents with user info
     */
    getActiveIntents: async (locationId, locationType) => {
        const { data, error } = await supabase
            .rpc('get_active_play_intents', {
                p_location_id: locationId.toString(),
                p_location_type: locationType
            });

        if (error) throw new Error(error.message);
        return data || [];
    },

    /**
     * Get activity timeline with clustered time blocks
     * @param {string} locationId - Location ID
     * @param {string} locationType - 'community' or 'business'
     * @returns {Promise<Array>} Time blocks with player counts
     */
    getIntentTimeline: async (locationId, locationType) => {
        const intents = await playIntentService.getActiveIntents(locationId, locationType);

        if (intents.length === 0) return [];

        // Cluster intents within ±15 minute windows
        const clusters = playIntentService.clusterIntents(intents);

        return clusters;
    },

    /**
     * Cluster play intents within ±15 minute windows
     * @param {Array} intents - Array of play intents
     * @returns {Array} Clustered time blocks
     */
    clusterIntents: (intents) => {
        const clusters = [];
        const sorted = [...intents].sort((a, b) =>
            new Date(a.intent_time) - new Date(b.intent_time)
        );

        for (const intent of sorted) {
            const intentTime = new Date(intent.intent_time);

            // Find existing cluster within ±15 minutes
            const existingCluster = clusters.find(c => {
                const timeDiff = Math.abs(c.centerTime - intentTime);
                return timeDiff <= 15 * 60 * 1000; // 15 minutes in milliseconds
            });

            if (existingCluster) {
                existingCluster.intents.push(intent);
                existingCluster.playerCount++;
                // Update center time to average
                const totalTime = existingCluster.intents.reduce((sum, i) =>
                    sum + new Date(i.intent_time).getTime(), 0
                );
                existingCluster.centerTime = new Date(totalTime / existingCluster.intents.length);
            } else {
                clusters.push({
                    centerTime: intentTime,
                    intents: [intent],
                    playerCount: 1
                });
            }
        }

        return clusters;
    },

    /**
     * Join an existing time block (create intent at cluster center time)
     * @param {string} locationId - Location ID
     * @param {string} locationType - 'community' or 'business'
     * @param {Date} timeBlock - Center time of the cluster
     * @param {string} sport - Optional sport
     * @param {string} skillLevel - Optional skill level
     * @param {string} note - Optional note
     * @returns {Promise<Object>} Created intent
     */
    joinTimeBlock: async (locationId, locationType, timeBlock, sport = null, skillLevel = null, note = null) => {
        return playIntentService.createIntent(
            locationId,
            locationType,
            timeBlock,
            sport,
            skillLevel,
            note
        );
    },

    /**
     * Cancel own play intent
     * @param {string} intentId - Intent UUID
     * @returns {Promise<boolean>} Success status
     */
    cancelIntent: async (intentId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in");

        const { error } = await supabase
            .from('play_intents')
            .delete()
            .eq('id', intentId)
            .eq('user_id', user.id); // RLS ensures user can only delete their own

        if (error) throw new Error(error.message);
        return true;
    },

    /**
     * Get participants for a specific time block
     * @param {string} locationId - Location ID
     * @param {string} locationType - 'community' or 'business'
     * @param {Date} timeBlock - Center time of the cluster
     * @returns {Promise<Array>} Participants in this time block
     */
    getParticipants: async (locationId, locationType, timeBlock) => {
        const intents = await playIntentService.getActiveIntents(locationId, locationType);
        const blockTime = new Date(timeBlock);

        // Filter intents within ±15 minutes of this time block
        const participants = intents.filter(intent => {
            const intentTime = new Date(intent.intent_time);
            const timeDiff = Math.abs(blockTime - intentTime);
            return timeDiff <= 15 * 60 * 1000;
        });

        return participants;
    },

    /**
     * Get user's own active intents
     * @returns {Promise<Array>} User's active intents
     */
    getUserIntents: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('play_intents')
            .select('*')
            .eq('user_id', user.id)
            .gt('expires_at', new Date().toISOString())
            .order('intent_time', { ascending: true });

        if (error) {
            console.error('Error fetching user intents:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Check if user has an intent near a specific time
     * @param {string} locationId - Location ID
     * @param {string} locationType - 'community' or 'business'
     * @param {Date} intentTime - Time to check
     * @returns {Promise<Object|null>} Existing intent or null
     */
    getUserIntentNearTime: async (locationId, locationType, intentTime) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const checkTime = new Date(intentTime);
        const before = new Date(checkTime.getTime() - 30 * 60 * 1000); // 30 min before
        const after = new Date(checkTime.getTime() + 30 * 60 * 1000); // 30 min after

        const { data } = await supabase
            .from('play_intents')
            .select('*')
            .eq('location_id', locationId.toString())
            .eq('location_type', locationType)
            .eq('user_id', user.id)
            .gte('intent_time', before.toISOString())
            .lte('intent_time', after.toISOString())
            .gt('expires_at', new Date().toISOString())
            .single();

        return data;
    },

    /**
     * Get total active player count for a location
     * @param {string} locationId - Location ID
     * @param {string} locationType - 'community' or 'business'
     * @returns {Promise<number>} Total players
     */
    getActivePlayerCount: async (locationId, locationType) => {
        const intents = await playIntentService.getActiveIntents(locationId, locationType);
        return intents.length;
    }
};
