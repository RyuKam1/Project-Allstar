import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create a Service Role Client (ADMIN ONLY)
// Requires process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'MISSING_KEY'
);

// DELETE: Terminate Account
export async function DELETE(request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server Configuration Error: Missing Service Role Key" }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) return NextResponse.json({ error: "Missing User ID" }, { status: 400 });

    // 1. Delete from Auth (This cascades to Public tables often, or we do manual)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) throw error;

    // 2. Delete Profile (If not cascaded)
    // const { error: pErr } = await supabaseAdmin.from('profiles').delete().eq('id', userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update User (Email, Password, Metadata)
export async function PATCH(request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server Configuration Error: Missing Service Role Key" }, { status: 500 });
  }

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

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
