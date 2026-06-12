import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminAuth";
import { enforceRateLimit } from "@/lib/server/rateLimit";

// Admin-only listing of claim requests, enriched with requester + venue + evidence.
// Replaces the previous browser-client getAllClaims (RLS-reliant) with a
// server route using the service role (master plan finding 2.8).
export async function GET(request) {
  const rateLimitResponse = await enforceRateLimit(request, "admin-claims-get", 60, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin } = authz;

  try {
    const { data: claims, error } = await supabaseAdmin
      .from("claim_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!claims?.length) return NextResponse.json({ claims: [] });

    const requesterIds = [...new Set(claims.map((c) => c.requester_id).filter(Boolean))];
    const officialVenueIds = [...new Set(claims.map((c) => c.venue_id).filter(Boolean))];
    const communityVenueIds = [...new Set(claims.map((c) => c.community_location_id).filter(Boolean))];
    const claimIds = claims.map((c) => c.id);

    const [profilesRes, officialRes, communityRes, evidenceRes] = await Promise.all([
      requesterIds.length
        ? supabaseAdmin.from("profiles").select("id, name, email").in("id", requesterIds)
        : { data: [] },
      officialVenueIds.length
        ? supabaseAdmin.from("venues").select("id, name").in("id", officialVenueIds)
        : { data: [] },
      communityVenueIds.length
        ? supabaseAdmin.from("community_locations").select("id, name").in("id", communityVenueIds)
        : { data: [] },
      claimIds.length
        ? supabaseAdmin
            .from("claim_evidence")
            .select("id, claim_id, type, storage_object_key, verification_payload, created_at")
            .in("claim_id", claimIds)
        : { data: [] },
    ]);

    const profilesById = new Map((profilesRes.data || []).map((p) => [p.id, p]));
    const officialById = new Map((officialRes.data || []).map((v) => [v.id, v]));
    const communityById = new Map((communityRes.data || []).map((v) => [v.id, v]));
    const evidenceByClaim = new Map();
    (evidenceRes.data || []).forEach((e) => {
      if (!evidenceByClaim.has(e.claim_id)) evidenceByClaim.set(e.claim_id, []);
      evidenceByClaim.get(e.claim_id).push(e);
    });

    const enriched = claims.map((claim) => {
      let venue = null;
      if (claim.venue_id) venue = officialById.get(claim.venue_id);
      else if (claim.community_location_id) venue = communityById.get(claim.community_location_id);
      return {
        ...claim,
        profile: profilesById.get(claim.requester_id) || { name: "Unknown", email: "N/A" },
        venue: venue || { name: "Unknown Venue" },
        evidence: evidenceByClaim.get(claim.id) || [],
      };
    });

    return NextResponse.json({ claims: enriched });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
