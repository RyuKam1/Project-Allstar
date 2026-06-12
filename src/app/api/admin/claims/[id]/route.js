import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/adminAuth';
import { enforceRateLimit } from '@/lib/server/rateLimit';
import { logAdminAudit } from '@/lib/server/adminAudit';
import { sanitizeText, sanitizeUuid } from '@/lib/security/inputSanitizer';
import { reportError } from '@/lib/server/reportError';

export async function PATCH(request, { params }) {
  const rateLimitResponse = await enforceRateLimit(request, 'admin-claims-patch', 40, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin, user } = authz;

  try {
    const { id } = await params;
    const safeClaimId = sanitizeUuid(id);
    const body = await request.json();
    const status = sanitizeText(body?.status, 20).toLowerCase();

    if (!safeClaimId) return NextResponse.json({ error: 'Missing claim id' }, { status: 400 });
    if (!['approved', 'rejected', 'rolled_back'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Ownership transfer + verification grant + rollback happen atomically
    // inside SECURITY DEFINER RPCs (see claim approval + maturity migrations).
    const rpcName =
      status === 'approved' ? 'approve_claim' : status === 'rolled_back' ? 'rollback_claim' : 'reject_claim';
    const { data: claim, error: claimError } = await supabaseAdmin
      .rpc(rpcName, { p_claim_id: safeClaimId });

    if (claimError || !claim) {
      return NextResponse.json({ error: claimError?.message || 'Claim not found' }, { status: 404 });
    }

    await logAdminAudit(supabaseAdmin, {
      action: 'resolve_claim',
      actorId: user.id,
      targetType: 'claim_request',
      targetId: safeClaimId,
      metadata: { status, requesterId: claim.requester_id }
    });

    return NextResponse.json({ success: true, claim });
  } catch (err) {
    await reportError('admin-claims-patch', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
