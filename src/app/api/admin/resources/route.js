import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/adminAuth';
import { enforceRateLimit } from '@/lib/server/rateLimit';
import { logAdminAudit } from '@/lib/server/adminAudit';

const RESOURCE_TABLES = {
  team: 'teams',
  tournament: 'tournaments',
  venue: 'venues'
};

export async function DELETE(request) {
  const rateLimitResponse = enforceRateLimit(request, 'admin-resources-delete', 25, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin, user } = authz;

  try {
    const { id, type } = await request.json();
    if (!id || !type) {
      return NextResponse.json({ error: 'Missing id or type' }, { status: 400 });
    }

    const table = RESOURCE_TABLES[type];
    if (!table) {
      return NextResponse.json({ error: 'Unsupported resource type' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
    if (error) throw error;

    await logAdminAudit(supabaseAdmin, {
      action: 'delete_resource',
      actorId: user.id,
      targetType: type,
      targetId: id
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
