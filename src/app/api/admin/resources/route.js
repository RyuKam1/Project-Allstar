import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/adminAuth';
import { enforceRateLimit } from '@/lib/server/rateLimit';
import { logAdminAudit } from '@/lib/server/adminAudit';
import { sanitizeText, sanitizeUuid } from '@/lib/security/inputSanitizer';

const RESOURCE_TABLES = {
  team: 'teams',
  tournament: 'tournaments',
  venue: 'venues'
};

function parseResourceId(id) {
  const uuid = sanitizeUuid(id);
  if (uuid) return uuid;
  const trimmed = sanitizeText(id, 64);
  return /^\d+$/.test(trimmed) ? trimmed : null;
}

export async function DELETE(request) {
  const rateLimitResponse = await enforceRateLimit(request, 'admin-resources-delete', 25, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin, user } = authz;

  try {
    const { id, type } = await request.json();
    const safeId = parseResourceId(id);
    const safeType = sanitizeText(type, 20).toLowerCase();

    if (!safeId || !safeType) {
      return NextResponse.json({ error: 'Missing id or type' }, { status: 400 });
    }

    const table = RESOURCE_TABLES[safeType];
    if (!table) {
      return NextResponse.json({ error: 'Unsupported resource type' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from(table).delete().eq('id', safeId);
    if (error) throw error;

    await logAdminAudit(supabaseAdmin, {
      action: 'delete_resource',
      actorId: user.id,
      targetType: safeType,
      targetId: safeId
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
