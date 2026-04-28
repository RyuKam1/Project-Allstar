import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/adminAuth';
import { enforceRateLimit } from '@/lib/server/rateLimit';
import { logAdminAudit } from '@/lib/server/adminAudit';

export async function PATCH(request, { params }) {
  const rateLimitResponse = enforceRateLimit(request, 'admin-claims-patch', 40, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin, user } = authz;

  try {
    const { id } = await params;
    const body = await request.json();
    const status = body?.status;

    if (!id) return NextResponse.json({ error: 'Missing claim id' }, { status: 400 });
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { data: claim, error: claimError } = await supabaseAdmin
      .from('claim_requests')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single();

    if (claimError || !claim) {
      return NextResponse.json({ error: claimError?.message || 'Claim not found' }, { status: 404 });
    }

    if (status === 'approved') {
      if (claim.venue_id) {
        const { error: venueError } = await supabaseAdmin
          .from('venues')
          .update({ owner_id: claim.requester_id })
          .eq('id', claim.venue_id);
        if (venueError) throw venueError;
      } else if (claim.community_location_id) {
        const { error: communityError } = await supabaseAdmin
          .from('community_locations')
          .update({ created_by: claim.requester_id })
          .eq('id', claim.community_location_id);
        if (communityError) throw communityError;
      }

      await supabaseAdmin
        .from('profiles')
        .update({ role: 'business' })
        .eq('id', claim.requester_id);
    }

    await logAdminAudit(supabaseAdmin, {
      action: 'resolve_claim',
      actorId: user.id,
      targetType: 'claim_request',
      targetId: id,
      metadata: { status, requesterId: claim.requester_id }
    });

    return NextResponse.json({ success: true, claim });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
