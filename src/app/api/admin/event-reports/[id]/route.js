import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminAuth";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import { logAdminAudit } from "@/lib/server/adminAudit";
import { sanitizeText, sanitizeUuid } from "@/lib/security/inputSanitizer";
import { reportError } from "@/lib/server/reportError";

export async function PATCH(request, { params }) {
  const rateLimitResponse = await enforceRateLimit(request, "admin-event-reports-patch", 40, 60_000);
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
      .from("event_reports")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", safeId)
      .select("*")
      .single();

    if (updateError || !report) {
      return NextResponse.json({ error: updateError?.message || "Report not found" }, { status: 404 });
    }

    if (removeTarget) {
      if (report.event_kind === "community") {
        const { error: delError } = await supabaseAdmin.from("events").delete().eq("id", report.event_id);
        if (delError) throw delError;
      } else {
        // Business events are soft-removed so the record/audit trail is kept.
        const { error: rmError } = await supabaseAdmin
          .from("business_events")
          .update({ status: "removed", updated_at: new Date().toISOString() })
          .eq("id", report.event_id);
        if (rmError) throw rmError;
      }
    }

    await logAdminAudit(supabaseAdmin, {
      action: "resolve_event_report",
      actorId: user.id,
      targetType: "event_report",
      targetId: safeId,
      metadata: { status, removeTarget, eventKind: report.event_kind, eventId: report.event_id },
    });

    await supabaseAdmin.from("notifications").insert({
      user_id: report.reporter_id,
      type: "report_resolved",
      title: "Your report was reviewed",
      body: removeTarget ? "Thanks — the reported event was removed." : "Thanks — our team reviewed your report.",
      link: "/trust-safety",
    });

    return NextResponse.json({ success: true, report });
  } catch (err) {
    await reportError("admin-event-reports-patch", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
