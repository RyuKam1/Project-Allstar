import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/adminAuth';
import { enforceRateLimit } from '@/lib/server/rateLimit';
import { logAdminAudit } from '@/lib/server/adminAudit';
import { sanitizeText, sanitizeUuid } from '@/lib/security/inputSanitizer';
import { reportError } from '@/lib/server/reportError';

export async function PATCH(request, { params }) {
  const rateLimitResponse = await enforceRateLimit(request, 'admin-venue-proposals-patch', 40, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin, user } = authz;

  try {
    const { id } = await params;
    const safeProposalId = sanitizeUuid(id);
    const body = await request.json();
    const status = sanitizeText(body?.status, 20).toLowerCase();
    const reviewNotes = body?.reviewNotes ? sanitizeText(body.reviewNotes, 1000) : null;

    if (!safeProposalId) return NextResponse.json({ error: 'Missing proposal id' }, { status: 400 });
    if (!['approved', 'rejected', 'needs_info'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    let result;
    if (status === 'approved') {
      const { data, error } = await supabaseAdmin.rpc('promote_venue_proposal', {
        p_proposal_id: safeProposalId,
        p_review_notes: reviewNotes
      });
      if (error) throw error;
      result = { createdVenueId: data };
    } else {
      const { data, error } = await supabaseAdmin.rpc('review_venue_proposal', {
        p_proposal_id: safeProposalId,
        p_status: status,
        p_review_notes: reviewNotes
      });
      if (error) throw error;
      result = { proposal: data };
    }

    await logAdminAudit(supabaseAdmin, {
      action: 'review_venue_proposal',
      actorId: user.id,
      targetType: 'venue_proposal',
      targetId: safeProposalId,
      metadata: { status }
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    await reportError('admin-venue-proposals-patch', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
