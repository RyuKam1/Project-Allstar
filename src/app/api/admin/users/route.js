import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/adminAuth';
import { enforceRateLimit } from '@/lib/server/rateLimit';
import { logAdminAudit } from '@/lib/server/adminAudit';

// DELETE: Terminate Account
export async function DELETE(request) {
  const rateLimitResponse = enforceRateLimit(request, 'admin-users-delete', 20, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin, user } = authz;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

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
  const rateLimitResponse = enforceRateLimit(request, 'admin-users-patch', 30, 60_000);
  if (rateLimitResponse) return rateLimitResponse;

  const authz = await requireAdmin(request);
  if (authz.error) return authz.error;
  const { supabaseAdmin, user } = authz;

  try {
    const body = await request.json();
    const { id, email, password, profile } = body;

    if (!id) return NextResponse.json({ error: "Missing User ID" }, { status: 400 });

    // 1. Update Profile (Public Table)
    if (profile) {
        const { error: pErr } = await supabaseAdmin
            .from('profiles')
            .update(profile)
            .eq('id', id);
        if (pErr) throw pErr;
    }

    // 2. Update Auth (Email/Password)
    const authUpdates = {};
    if (email) authUpdates.email = email;
    if (password) authUpdates.password = password;

    if (Object.keys(authUpdates).length > 0) {
        const { error: aErr } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates);
        if (aErr) throw aErr;
    }

    await logAdminAudit(supabaseAdmin, {
      action: 'update_user',
      actorId: user.id,
      targetType: 'user',
      targetId: id,
      metadata: { profileUpdated: !!profile, authUpdated: Object.keys(authUpdates).length > 0 }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
