import { supabase } from "@/lib/supabaseClient";

/**
 * Community Location Service
 * Handles user-added informal locations with reputation-based editing
 */
export const communityLocationService = {
    /**
     * Create a new community location
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {string} name - Location name
     * @param {string} description - Optional description
     * @param {string} address - Optional address
     * @param {Array<string>} sports - Array of supported sports
     * @param {Array<string>} images - Array of base64 image strings
     * @returns {Promise<Object>} Created location
     */
    createLocation: async (lat, lng, name, description, address, sports, images = []) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to add a location");

        // Validate inputs
        if (!name || name.trim().length < 3) {
            throw new Error("Location name must be at least 3 characters");
        }
        if (!lat || !lng) {
            throw new Error("Location coordinates are required");
        }
        if (!sports || sports.length === 0) {
            throw new Error("Please select at least one sport");
        }

        // Create location
        const { data: location, error } = await supabase
            .from('community_locations')
            .insert({
                lat,
                lng,
                name: name.trim(),
                description: description?.trim() || null,
                address: address?.trim() || null, // Save address
                sports,
                created_by: user.id,
                status: 'active' // Explicitly set active so it shows up
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Upload images if provided
        if (images.length > 0) {
            const imagePromises = images.map(img =>
                communityLocationService.uploadImage(location.id, img)
            );
            await Promise.all(imagePromises);
        }

        return location;
    },

    /**
     * Get location by ID with images and stats
     * @param {string} locationId - Location UUID
     * @returns {Promise<Object>} Location with images
     */
    getLocationById: async (locationId) => {
        const { data: location, error } = await supabase
            .from('community_locations')
            .select('*')
            .eq('id', locationId)
            .single();

        if (error) throw new Error(error.message);
        if (!location) return null;

        // Fetch images
        const { data: images } = await supabase
            .from('location_images')
            .select('*')
            .eq('location_id', locationId)
            .order('created_at', { ascending: true });

        location.images = images || [];

        return location;
    },

    /**
     * Get nearby community locations
     * @param {number} lat - Center latitude
     * @param {number} lng - Center longitude
     * @param {number} radiusKm - Radius in kilometers
     * @returns {Promise<Array>} Nearby locations
     */
    getNearbyLocations: async (lat, lng, radiusKm = 10) => {
        // Simple bounding box query (for more accuracy, use PostGIS)
        const latDelta = radiusKm / 111; // 1 degree lat ≈ 111km
        const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

        // 1. Fetch Locations
        const { data: locations, error } = await supabase
            .from('community_locations')
            .select(`
                *,
                location_images (
                    image_url
                )
            `)
            .gte('lat', lat - latDelta)
            .lte('lat', lat + latDelta)
            .gte('lng', lng - lngDelta)
            .lte('lng', lng + lngDelta)
            .eq('status', 'active');

        if (error) throw new Error(error.message);
        if (!locations || locations.length === 0) return [];

        // 2. Fetch Business Configs manually (to bypass potential Join/RLS issues)
        // 2. Fetch Business Configs manually (via API to bypass RLS)
        const locationIds = locations.map(l => l.id);
        let businessConfigs = [];

        try {
            const response = await fetch('/api/venues/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ venueIds: locationIds })
            });

            if (response.ok) {
                const result = await response.json();
                businessConfigs = result.data || [];
            }
        } catch (err) {
            console.error("Error fetching configs:", err);
        }

        const configMap = new Map();
        if (businessConfigs) {
            businessConfigs.forEach(b => configMap.set(b.venue_id, b));
        }

        // 3. Merge
        return locations.map(loc => {
            const biz = configMap.get(loc.id);
            const isBusiness = !!biz;

            const bookingConfig = biz?.booking_config || {};

            return {
                ...loc,
                images: loc.location_images,
                // Unified card props
                type: isBusiness ? 'business' : 'community',
                isBusiness: isBusiness,
                price: bookingConfig.paymentType === 'Paid'
                    ? `${bookingConfig.price} ${bookingConfig.priceUnit || ''}`
                    : (isBusiness ? 'Free' : 'Free / Public'),
                amenities: bookingConfig.amenities || loc.sports || [],
                venue_id: loc.id
            };
        });
    },

    /**
     * Get locations by city name (Address search)
     * @param {string} cityName - Name of the city (can contain special chars)
     * @returns {Promise<Array>} Locations in that city
     */
    getLocationsByCity: async (cityName) => {
        // Prepare variations: 
        // 1. Exact input (e.g. "Akhmet'a")
        // 2. Normalized (e.g. "akhmeta")
        const rawName = cityName.trim();
        const normalizedName = rawName.toLowerCase().replace(/['’]/g, "");

        console.log(`Searching locations for: "${rawName}" OR "${normalizedName}"`);

        // 1. Fetch Locations
        const { data: locations, error } = await supabase
            .from('community_locations')
            .select(`
                *,
                location_images (
                    image_url
                )
            `)
            // Search for EITHER the raw name OR the normalized name in the address
            .or(`address.ilike.%${rawName}%,address.ilike.%${normalizedName}%`)
            .eq('status', 'active');

        if (error) throw new Error(error.message);
        if (!locations || locations.length === 0) return [];

        // 2. Fetch Business Configs manually
        // 2. Fetch Business Configs manually (via API)
        const locationIds = locations.map(l => l.id);
        let businessConfigs = [];

        try {
            const response = await fetch('/api/venues/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ venueIds: locationIds })
            });

            if (response.ok) {
                const result = await response.json();
                businessConfigs = result.data || [];
            }
        } catch (err) {
            console.error("Error fetching configs:", err);
        }

        const configMap = new Map();
        if (businessConfigs) {
            businessConfigs.forEach(b => configMap.set(b.venue_id, b));
        }

        // 3. Merge
        return locations.map(loc => {
            const biz = configMap.get(loc.id);
            const isBusiness = !!biz;
            const bookingConfig = biz?.booking_config || {};

            return {
                ...loc,
                images: loc.location_images,
                type: isBusiness ? 'business' : 'community',
                isBusiness: isBusiness,
                price: bookingConfig.paymentType === 'Paid'
                    ? `${bookingConfig.price} ${bookingConfig.priceUnit || ''}`
                    : (isBusiness ? 'Free' : 'Free / Public'),
                amenities: bookingConfig.amenities || loc.sports || [],
                venue_id: loc.id
            };
        });
    },

    /**
     * Submit an edit to a community location
     * @param {string} locationId - Location UUID
     * @param {string} field - Field to edit (name, description, sports, coordinates)
     * @param {any} newValue - New value
     * @returns {Promise<Object>} Edit record
     */
    submitEdit: async (locationId, field, newValue) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to edit");

        // Calculate user's weight for this location
        const weight = await communityLocationService.getUserWeight(user.id, locationId);

        // Get current value AND created_by
        const { data: location } = await supabase
            .from('community_locations')
            .select(`${field}, created_by`)
            .eq('id', locationId)
            .single();

        const oldValue = location ? location[field] : null;

        // Check if user is creator
        const isCreator = location && location.created_by === user.id;
        console.log(`Debug: submitEdit - User: ${user.id}, Creator: ${location?.created_by}, isCreator: ${isCreator}`);

        // Create edit record
        const { data: edit, error } = await supabase
            .from('location_edits')
            .insert({
                location_id: locationId,
                user_id: user.id,
                edit_type: field,
                old_value: JSON.stringify(oldValue),
                new_value: JSON.stringify(newValue),
                weight,
                status: (weight >= 2.0 || isCreator) ? 'applied' : 'pending' // Auto-apply if high weight or creator
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        // If auto-applied, update the location
        if (edit.status === 'applied') {
            await supabase
                .from('community_locations')
                .update({ [field]: newValue, updated_at: new Date().toISOString() })
                .eq('id', locationId);
        }

        return edit;
    },

    /**
     * Upload image to community location
     * @param {string} locationId - Location UUID
     * @param {string} base64Image - Base64 image string
     * @returns {Promise<Object>} Image record
     */
    uploadImage: async (locationId, base64Image) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to upload");

        const { data, error } = await supabase
            .from('location_images')
            .insert({
                location_id: locationId,
                image_url: base64Image,
                uploaded_by: user.id
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Get edit history for a location
     * @param {string} locationId - Location UUID
     * @returns {Promise<Array>} Edit history
     */
    getEditHistory: async (locationId) => {
        const { data, error } = await supabase
            .from('location_edits')
            .select(`
        *,
        profiles:user_id (
          id,
          name,
          avatar
        )
      `)
            .eq('location_id', locationId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    },

    /**
     * Get user's credibility weight for a location
     * @param {string} userId - User ID
     * @param {string} locationId - Location UUID
     * @returns {Promise<number>} Weight multiplier
     */
    getUserWeight: async (userId, locationId) => {
        const { data, error } = await supabase
            .rpc('calculate_user_location_weight', {
                p_user_id: userId,
                p_location_id: locationId,
                p_location_type: 'community'
            });

        if (error) {
            console.error('Error calculating weight:', error);
            return 1.0;
        }

        return data || 1.0;
    },

    /**
     * Search community locations by name or sport
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching locations
     */
    searchLocations: async (query) => {
        const { data, error } = await supabase
            .from('community_locations')
            .select('*')
            .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
            .eq('status', 'active')
            .limit(20);

        if (error) throw new Error(error.message);
        return data || [];
    },

    /**
     * Get pending edits for a location (for owner review)
     * @param {string} locationId 
     */
    getPendingEdits: async (locationId) => {
        const { data, error } = await supabase
            .from('location_edits')
            .select(`
                *,
                profiles:user_id (name, avatar)
            `)
            .eq('location_id', locationId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    },

    /**
     * Process an edit (Approve/Reject)
     * @param {string} editId 
     * @param {string} decision 'applied' or 'rejected'
     */
    processEdit: async (editId, decision) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in");

        console.log(`Processing edit ${editId} as ${decision} by ${user.id}`);

        // 1. Get the edit to verify permissions and data
        const { data: edit } = await supabase
            .from('location_edits')
            .select('*, community_locations(created_by)')
            .eq('id', editId)
            .single();

        if (!edit) throw new Error("Edit not found");

        // Verify user is the owner of the location
        if (edit.community_locations.created_by !== user.id) {
            throw new Error("Only the location owner can process edits");
        }

        // 2. Update status
        const { error: updateError } = await supabase
            .from('location_edits')
            .update({
                status: decision,
                applied_at: decision === 'applied' ? new Date().toISOString() : null
            })
            .eq('id', editId);

        if (updateError) {
            console.error('Error updating edit status:', updateError);
            throw new Error(updateError.message);
        }

        // 3. If approved, apply the change to the location
        if (decision === 'applied') {
            const field = edit.edit_type;
            const newValue = JSON.parse(edit.new_value);

            console.log(`Applying change: ${field} = ${newValue}`);

            const { error: locUpdateError } = await supabase
                .from('community_locations')
                .update({ [field]: newValue, updated_at: new Date().toISOString() })
                .eq('id', edit.location_id);

            if (locUpdateError) {
                console.error('Error applying change to location:', locUpdateError);
                throw new Error("Failed to apply change to location: " + locUpdateError.message);
            }
        }

        return true;
    }
};
