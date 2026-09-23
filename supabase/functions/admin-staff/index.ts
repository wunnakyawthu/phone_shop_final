import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authorization = request.headers.get('Authorization') ?? ''
    const callerClient = createClient(url, anon, { global: { headers: { Authorization: authorization } } })
    const adminClient = createClient(url, service, { auth: { persistSession: false } })
    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) throw new Error('Sign in again before creating staff.')
    const { data: roleRow } = await adminClient.from('user_roles').select('role').eq('user_id', userData.user.id).single()
    const { data: profileRow } = await adminClient.from('profiles').select('is_active').eq('id', userData.user.id).single()
    if (!profileRow?.is_active || !['owner', 'manager'].includes(roleRow?.role)) throw new Error('Only an owner or manager can create staff.')

    const body = await request.json()
    if (body.action === 'delete') {
      if (roleRow.role !== 'owner') throw new Error('Only the owner can delete staff accounts.')
      const targetId = String(body.userId ?? '')
      if (!targetId || targetId === userData.user.id) throw new Error('You cannot delete your own account.')
      const { data: targetRole } = await adminClient.from('user_roles').select('role').eq('user_id', targetId).single()
      if (!targetRole || targetRole.role === 'owner') throw new Error('The owner account cannot be deleted.')
      // Migration 056 changes profile audit foreign keys to SET NULL and the
      // auth-user/profile relationship to CASCADE. Deleting the Auth user now
      // removes the login, identities, sessions, profile and role permanently,
      // while transaction text snapshots remain available on vouchers.
      const { error: authError } = await adminClient.auth.admin.deleteUser(targetId, false)
      if (authError) throw authError
      return new Response(JSON.stringify({ deleted: true, permanent: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    const role = String(body.role)
    if (!['phone_staff', 'computer_staff', 'manager'].includes(role)) throw new Error('Invalid staff role.')
    if (roleRow.role === 'manager' && role === 'manager') throw new Error('Managers cannot create another manager.')
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: String(body.email).trim(),
      password: String(body.password),
      email_confirm: true,
      user_metadata: { full_name: String(body.fullName).trim() },
    })
    if (createError) throw createError
    const userId = created.user.id
    const { error: profileError } = await adminClient.from('profiles').upsert({ id: userId, full_name: String(body.fullName).trim(), email: String(body.email).trim(), phone: String(body.phone ?? '').trim() || null, is_active: true, created_by: userData.user.id })
    if (profileError) throw profileError
    const { error: roleError } = await adminClient.from('user_roles').upsert({ user_id: userId, role, assigned_by: userData.user.id })
    if (roleError) throw roleError
    return new Response(JSON.stringify({ id: userId }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Staff operation failed.' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
