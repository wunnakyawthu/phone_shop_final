import type { User } from '@supabase/supabase-js'
import { supabase } from '../supabase/client'
import type { AppRole } from '../../types/app'

export type StaffProfile = {
  id: string
  fullName: string
  isActive: boolean
  role: AppRole
}

export async function getStaffProfile(user: User): Promise<StaffProfile | null> {
  if (!supabase) return null
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, is_active')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile) return null
  const { data: roleRecord, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()
  if (roleError) throw roleError
  if (!roleRecord) return null
  return {
    id: profile.id,
    fullName: profile.full_name,
    isActive: profile.is_active,
    role: roleRecord.role,
  }
}
