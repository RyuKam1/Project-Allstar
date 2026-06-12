import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminAuth";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import { logAdminAudit } from "@/lib/server/adminAudit";
import { sanitizeText, sanitizeUuid } from "@/lib/security/inputSanitizer";
import { reportError } from "@/lib/server/reportError";

export async function PATCH(request, { params }) {
  const rateLimitResponse = await enforceRateLimit(request, "admin-location-reports-patch", 40, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin, user } = authz;

  try {
    const { id } = await params;
    const safeId = sanitizeUuid(id);
    const body = await request.json();
    const status = sanitizeText(body?.status, 20).toLowerCase();
    const removeTarget = body?.removeTarget === true;

    if (!safeId) return NextResponse.json({ error: "Missing report id" }, { status: 400 });
    if (!["reviewed", "dismissed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data: report, error: updateError } = await supabaseAdmin
      .from("location_reports")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", safeId)
      .select("*")
      .single();

    if (updateError || !report) {
      return NextResponse.json({ error: updateError?.message || "Report not found" }, { status: 404 });
    }

    if (removeTarget) {
      const table = report.location_type === "community" ? "community_locations" : "venues";
      const { error: delError } = await supabaseAdmin.from(table).delete().eq("id", report.location_id);
      if (delError) throw delError;
    }

    await logAdminAudit(supabaseAdmin, {
      action: "resolve_location_report",
      actorId: user.id,
      targetType: "location_report",
      targetId: safeId,
      metadata: { status, removeTarget, locationType: report.location_type, locationId: report.location_id },
    });

    await supabaseAdmin.from("notifications").insert({
      user_id: report.reporter_id,
      type: "report_resolved",
      title: "Your report was reviewed",
      body: removeTarget ? "Thanks — the reported listing was removed." : "Thanks — our team reviewed your report.",
      link: "/trust-safety",
    });

    return NextResponse.json({ success: true, report });
  } catch (err) {
    await reportError("admin-location-reports-patch", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
