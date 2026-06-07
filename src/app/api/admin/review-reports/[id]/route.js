import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminAuth";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import { logAdminAudit } from "@/lib/server/adminAudit";
import { sanitizeUuid } from "@/lib/security/inputSanitizer";

const ALLOWED_STATUSES = new Set(["reviewed", "dismissed"]);

export async function PATCH(request, { params }) {
  const rateLimitResponse = await enforceRateLimit(
    request,
    "admin-review-reports-patch",
    40,
    60_000,
  );
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin, user } = authz;

  try {
    const { id } = await params;
    const safeId = sanitizeUuid(id);
    if (!safeId) {
      return NextResponse.json({ error: "Missing report id" }, { status: 400 });
    }

    const body = await request.json();
    const status = String(body?.status || "").toLowerCase();
    const deleteReview = body?.deleteReview === true;

    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { data: report, error: reportError } = await supabaseAdmin
      .from("review_reports")
      .select("*")
      .eq("id", safeId)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: reportError?.message || "Report not found" },
        { status: 404 },
      );
    }

    if (deleteReview && report.review_id) {
      const { error: deleteError } = await supabaseAdmin
        .from("venue_reviews")
        .delete()
        .eq("id", report.review_id);
      if (deleteError) throw deleteError;
    } else {
      const { error: updateError } = await supabaseAdmin
        .from("review_reports")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", safeId);
      if (updateError) throw updateError;
    }

    await logAdminAudit(supabaseAdmin, {
      action: deleteReview ? "delete_reported_review" : "resolve_review_report",
      actorId: user.id,
      targetType: "review_report",
      targetId: safeId,
      metadata: {
        status,
        deleteReview,
        reviewId: report.review_id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
