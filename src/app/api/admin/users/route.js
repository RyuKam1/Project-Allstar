import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/adminAuth';
import { enforceRateLimit } from '@/lib/server/rateLimit';
import { logAdminAudit } from '@/lib/server/adminAudit';
import { sanitizeEmail, sanitizeText, sanitizeUuid } from '@/lib/security/inputSanitizer';

const ALLOWED_PROFILE_FIELDS = new Set([
  'name',
  'avatar',
  'bio',
  'sport',
  'height',
  'weight',
  'speed',
  'vertical'
]);

// DELETE: Terminate Account
export async function DELETE(request) {
  const rateLimitResponse = await enforceRateLimit(request, 'admin-users-delete', 20, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin, user } = authz;

  try {
    const { searchParams } = new URL(request.url);
    const userId = sanitizeUuid(searchParams.get('id'));

    if (!userId) return NextResponse.json({ error: "Missing User ID" }, { status: 400 });

    // 1. Delete from Auth (This cascades to Public tables often, or we do manual)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) throw error;

    await logAdminAudit(supabaseAdmin, {
      action: 'delete_user',
      actorId: user.id,
      targetType: 'user',
      targetId: userId
    });

    // 2. Delete Profile (If not cascaded)
    // const { error: pErr } = await supabaseAdmin.from('profiles').delete().eq('id', userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update User (Email, Password, Metadata)
export async function PATCH(request) {
  const rateLimitResponse = await enforceRateLimit(request, 'admin-users-patch', 30, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin, user } = authz;

  try {
    const body = await request.json();
    const { id, email, password, profile } = body;

    const safeUserId = sanitizeUuid(id);
    if (!safeUserId) return NextResponse.json({ error: "Missing User ID" }, { status: 400 });

    const safeProfile = {};
    if (profile && typeof profile === 'object') {
      for (const [key, value] of Object.entries(profile)) {
        if (!ALLOWED_PROFILE_FIELDS.has(key)) continue;
        safeProfile[key] = typeof value === 'string' ? sanitizeText(value, 1200) : value;
      }
    }

    // 1. Update Profile (Public Table)
    if (Object.keys(safeProfile).length > 0) {
        const { error: pErr } = await supabaseAdmin
            .from('profiles')
            .update(safeProfile)
            .eq('id', safeUserId);
        if (pErr) throw pErr;
    }

    // 2. Update Auth (Email/Password)
    const authUpdates = {};
    if (email) authUpdates.email = sanitizeEmail(email);
    if (password) authUpdates.password = sanitizeText(password, 256);

    if (Object.keys(authUpdates).length > 0) {
        const { error: aErr } = await supabaseAdmin.auth.admin.updateUserById(safeUserId, authUpdates);
        if (aErr) throw aErr;
    }

    await logAdminAudit(supabaseAdmin, {
      action: 'update_user',
      actorId: user.id,
      targetType: 'user',
      targetId: safeUserId,
      metadata: { profileUpdated: Object.keys(safeProfile).length > 0, authUpdated: Object.keys(authUpdates).length > 0 }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
