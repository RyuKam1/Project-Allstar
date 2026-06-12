import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminAuth";
import { enforceRateLimit } from "@/lib/server/rateLimit";

// Admin-only listing of location reports (venues + community locations),
// enriched with reporter profile and basic target metadata.
export async function GET(request) {
  const rateLimitResponse = await enforceRateLimit(request, "admin-location-reports-get", 60, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin } = authz;

  try {
    const { data: reports, error } = await supabaseAdmin
      .from("location_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!reports?.length) return NextResponse.json({ reports: [] });

    const reporterIds = [...new Set(reports.map((r) => r.reporter_id).filter(Boolean))];
    const communityIds = [
      ...new Set(reports.filter((r) => r.location_type === "community").map((r) => r.location_id)),
    ];
    const venueIds = [
      ...new Set(reports.filter((r) => r.location_type === "venue").map((r) => r.location_id)),
    ];

    const [reportersRes, communityRes, venuesRes] = await Promise.all([
      reporterIds.length
        ? supabaseAdmin.from("profiles").select("id, name, email").in("id", reporterIds)
        : { data: [] },
      communityIds.length
        ? supabaseAdmin.from("community_locations").select("id, name").in("id", communityIds)
        : { data: [] },
      venueIds.length
        ? supabaseAdmin.from("venues").select("id, name").in("id", venueIds)
        : { data: [] },
    ]);

    const reportersById = new Map((reportersRes.data || []).map((p) => [p.id, p]));
    const communityById = new Map((communityRes.data || []).map((v) => [String(v.id), v]));
    const venuesById = new Map((venuesRes.data || []).map((v) => [String(v.id), v]));

    const enriched = reports.map((r) => {
      const target =
        r.location_type === "community"
          ? communityById.get(String(r.location_id))
          : venuesById.get(String(r.location_id));
      return {
        ...r,
        reporter: reportersById.get(r.reporter_id) || { name: "Unknown", email: "N/A" },
        target: target || { name: "Unknown / removed" },
      };
    });

    return NextResponse.json({ reports: enriched });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
