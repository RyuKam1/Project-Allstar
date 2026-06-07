import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminAuth";
import { enforceRateLimit } from "@/lib/server/rateLimit";

export async function GET(request) {
  const rateLimitResponse = await enforceRateLimit(
    request,
    "admin-review-reports-get",
    60,
    60_000,
  );
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin } = authz;

  try {
    const { data: reports, error } = await supabaseAdmin
      .from("review_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!reports?.length) {
      return NextResponse.json({ reports: [] });
    }

    const reviewIds = [...new Set(reports.map((r) => r.review_id).filter(Boolean))];
    const reporterIds = [...new Set(reports.map((r) => r.reporter_id).filter(Boolean))];

    const [reviewsRes, reportersRes] = await Promise.all([
      reviewIds.length
        ? supabaseAdmin
            .from("venue_reviews")
            .select("id, rating, comment, location_id, location_type, user_id, created_at")
            .in("id", reviewIds)
        : { data: [] },
      reporterIds.length
        ? supabaseAdmin
            .from("profiles")
            .select("id, name, email")
            .in("id", reporterIds)
        : { data: [] },
    ]);

    const authorIds = [
      ...new Set((reviewsRes.data || []).map((r) => r.user_id).filter(Boolean)),
    ];
    const authorsRes = authorIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, name, email")
          .in("id", authorIds)
      : { data: [] };

    const reviewsById = new Map((reviewsRes.data || []).map((r) => [r.id, r]));
    const reportersById = new Map((reportersRes.data || []).map((p) => [p.id, p]));
    const authorsById = new Map((authorsRes.data || []).map((p) => [p.id, p]));

    const enriched = reports.map((report) => {
      const review = reviewsById.get(report.review_id) || null;
      const author = review ? authorsById.get(review.user_id) : null;
      return {
        ...report,
        review: review
          ? {
              ...review,
              author: author || { name: "Unknown", email: "N/A" },
            }
          : null,
        reporter: reportersById.get(report.reporter_id) || {
          name: "Unknown",
          email: "N/A",
        },
      };
    });

    return NextResponse.json({ reports: enriched });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
