import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminAuth";
import { enforceRateLimit } from "@/lib/server/rateLimit";

// Admin-only listing of event reports (community + business events).
export async function GET(request) {
  const rateLimitResponse = await enforceRateLimit(request, "admin-event-reports-get", 60, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin } = authz;

  try {
    const { data: reports, error } = await supabaseAdmin
      .from("event_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!reports?.length) return NextResponse.json({ reports: [] });

    const reporterIds = [...new Set(reports.map((r) => r.reporter_id).filter(Boolean))];
    const communityIds = reports.filter((r) => r.event_kind === "community").map((r) => r.event_id);
    const businessIds = reports.filter((r) => r.event_kind === "business").map((r) => r.event_id);

    const [reportersRes, communityRes, businessRes] = await Promise.all([
      reporterIds.length
        ? supabaseAdmin.from("profiles").select("id, name, email").in("id", reporterIds)
        : { data: [] },
      communityIds.length
        ? supabaseAdmin.from("events").select("id, title").in("id", communityIds)
        : { data: [] },
      businessIds.length
        ? supabaseAdmin.from("business_events").select("id, title").in("id", businessIds)
        : { data: [] },
    ]);

    const reportersById = new Map((reportersRes.data || []).map((p) => [p.id, p]));
    const communityById = new Map((communityRes.data || []).map((e) => [String(e.id), e]));
    const businessById = new Map((businessRes.data || []).map((e) => [String(e.id), e]));

    const enriched = reports.map((r) => {
      const target =
        r.event_kind === "community"
          ? communityById.get(String(r.event_id))
          : businessById.get(String(r.event_id));
      return {
        ...r,
        reporter: reportersById.get(r.reporter_id) || { name: "Unknown", email: "N/A" },
        target: target || { title: "Unknown / removed" },
      };
    });

    return NextResponse.json({ reports: enriched });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
