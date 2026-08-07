import { supabaseAdmin } from './supabaseAdmin';

// agencyId can be null for platform-wide (super admin) actions.
export async function logAudit(agencyId, actorLabel, action, target) {
  try {
    await supabaseAdmin.from('audit_logs').insert({ agency_id: agencyId, actor_label: actorLabel, action, target: target || null });
  } catch (e) {
    console.error('Failed to write audit log:', e.message);
  }
}
