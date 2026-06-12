import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminAuth";
import { enforceRateLimit } from "@/lib/server/rateLimit";

// Admin-only listing of venue proposals, enriched with the proposer profile.
export async function GET(request) {
  const rateLimitResponse = await enforceRateLimit(request, "admin-venue-proposals-get", 60, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin } = authz;

  try {
    const { data: proposals, error } = await supabaseAdmin
      .from("venue_proposals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!proposals?.length) return NextResponse.json({ proposals: [] });

    const proposerIds = [...new Set(proposals.map((p) => p.proposer_id).filter(Boolean))];
    const profilesRes = proposerIds.length
      ? await supabaseAdmin.from("profiles").select("id, name, email").in("id", proposerIds)
      : { data: [] };
    const profilesById = new Map((profilesRes.data || []).map((p) => [p.id, p]));

    const enriched = proposals.map((p) => ({
      ...p,
      proposer: profilesById.get(p.proposer_id) || { name: "Unknown", email: "N/A" },
    }));

    return NextResponse.json({ proposals: enriched });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
