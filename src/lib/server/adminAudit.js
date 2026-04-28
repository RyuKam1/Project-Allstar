export async function logAdminAudit(supabaseAdmin, payload) {
  const event = {
    action: payload.action,
    actor_id: payload.actorId,
    target_type: payload.targetType || null,
    target_id: payload.targetId || null,
    metadata: payload.metadata || {},
    created_at: new Date().toISOString()
  };

  const { error } = await supabaseAdmin.from('admin_audit_logs').insert(event);
  if (error) {
    // Do not break admin operation because of logging table mismatch/missing migration.
    console.warn('Admin audit log write failed:', error.message);
  }
}
