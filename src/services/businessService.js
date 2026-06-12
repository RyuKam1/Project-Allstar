import { supabase } from "@/lib/supabaseClient";
import { sanitizeHttpUrl } from "@/lib/security/inputSanitizer";

const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Verify the file's real content type by sniffing magic bytes, not trusting
// the browser-provided file.type. Returns a normalized type or null.
async function sniffEvidenceType(file) {
  const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const hex = (n) => buf[n]?.toString(16).padStart(2, "0");
  // JPEG
  if (hex(0) === "ff" && hex(1) === "d8" && hex(2) === "ff") return "image/jpeg";
  // PNG
  if (hex(0) === "89" && hex(1) === "50" && hex(2) === "4e" && hex(3) === "47") return "image/png";
  // PDF (%PDF)
  if (hex(0) === "25" && hex(1) === "50" && hex(2) === "44" && hex(3) === "46") return "application/pdf";
  // WEBP (RIFF....WEBP)
  if (hex(0) === "52" && hex(1) === "49" && hex(2) === "46" && hex(3) === "46" &&
      hex(8) === "57" && hex(9) === "45" && hex(10) === "42" && hex(11) === "50") return "image/webp";
  return null;
}

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

    // Propose a new official venue.
    // Direct venues.insert is denied by RLS; new official listings must go
    // through the venue_proposals queue and be promoted by an admin.
    proposeVenue: async (venueData) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in");

        const { data, error } = await supabase.rpc('submit_venue_proposal', {
            p_name: venueData.name,
            p_description: venueData.description || null,
            p_sports: venueData.sports || [],
            p_lat: venueData.lat ?? null,
            p_lng: venueData.lng ?? null,
            p_address: venueData.address || null
        });

        if (error) throw new Error(error.message);
        return data;
    },

    // Backwards-compatible alias: now submits a proposal for admin review
    // instead of creating an official venue directly.
    createBusinessVenue: async (venueData) => {
        return businessService.proposeVenue(venueData);
    },

    // Opt the current user into business onboarding (none -> pending).
    requestBusinessAccount: async () => {
        const { data, error } = await supabase.rpc('request_business_account');
        if (error) throw new Error(error.message);
        return data; // returns the resulting verification status
    },

    // List the current user's venue proposals (pending/approved/rejected).
    getMyVenueProposals: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data, error } = await supabase
            .from('venue_proposals')
            .select('*')
            .eq('proposer_id', user.id)
            .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    // Attach evidence to a claim. Optionally upload a private file to the
    // 'trust-evidence' bucket first, then record a claim_evidence row.
    addClaimEvidence: async (claimId, { type = 'other', payload = null, file = null } = {}) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in");

        let objectKey = null;
        if (file) {
            if (file.size > EVIDENCE_MAX_BYTES) {
                throw new Error("Evidence file is too large (max 10MB)");
            }
            const sniffed = await sniffEvidenceType(file);
            if (!sniffed) {
                throw new Error("Unsupported file type. Upload a JPG, PNG, WEBP, or PDF.");
            }
            const safeName = (file.name || 'evidence').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
            objectKey = `${user.id}/${claimId}/${Date.now()}_${safeName}`;
            const { error: uploadError } = await supabase.storage
                .from('trust-evidence')
                .upload(objectKey, file, { upsert: false, contentType: sniffed });
            if (uploadError) throw new Error(uploadError.message);
        }

        let safePayload = null;
        if (payload) {
            if (type === 'domain') {
                safePayload = sanitizeHttpUrl(payload, 500);
                if (!safePayload) {
                    throw new Error('Enter a valid website URL (http or https).');
                }
            } else {
                safePayload = String(payload).slice(0, 2000);
            }
        }

        const { data, error } = await supabase
            .from('claim_evidence')
            .insert({
                claim_id: claimId,
                type,
                storage_object_key: objectKey,
                verification_payload: safePayload
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    // Admin: Get All Claims (server route, service-role enriched)
    getAllClaims: async () => {
        const res = await fetch('/api/admin/claims');
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to load claims');
        return payload.claims || [];
    },

    // Admin: Resolve Claim (Approve/Reject)
    resolveClaim: async (claimId, status) => {
        const res = await fetch(`/api/admin/claims/${claimId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to resolve claim');
        return payload.claim;
    },

    // Admin: list all venue proposals (server route).
    getAllVenueProposals: async () => {
        const res = await fetch('/api/admin/venue-proposals');
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to load venue proposals');
        return payload.proposals || [];
    },

    // Admin: likely-duplicate venue pairs (trigram similarity).
    getDuplicateVenues: async () => {
        const res = await fetch('/api/admin/duplicates');
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to load duplicates');
        return payload.duplicates || [];
    },

    // Admin: approve / reject / request-info on a proposal.
    reviewVenueProposal: async (proposalId, status, reviewNotes = null) => {
        const res = await fetch(`/api/admin/venue-proposals/${proposalId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, reviewNotes })
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to review proposal');
        return payload;
    }
};
