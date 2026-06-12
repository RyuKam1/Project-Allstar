import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminAuth";
import { enforceRateLimit } from "@/lib/server/rateLimit";

// Admin-only: likely-duplicate venue pairs via trigram name similarity.
export async function GET(request) {
  const rateLimitResponse = await enforceRateLimit(request, "admin-duplicates-get", 30, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin } = authz;

  try {
    const url = new URL(request.url);
    const threshold = Math.min(Math.max(Number(url.searchParams.get("threshold")) || 0.6, 0.1), 0.99);

    const { data, error } = await supabaseAdmin.rpc("find_duplicate_venues", { p_threshold: threshold });
    if (error) throw error;
    return NextResponse.json({ duplicates: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
