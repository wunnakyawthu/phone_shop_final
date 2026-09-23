import { supabase } from '../../lib/supabase/client'

export type PublicComputer = {
  id: string

  brand_name: string | null

  model_name: string | null

  computer_type: string

  cpu: string | null

  ram: string | null

  primary_storage_type: string | null

  primary_storage_size: string | null

  gpu: string | null

  screen_size: string | null

  color: string | null

  condition: string

  sale_price: number

  photo_path: string | null
}

export async function getPublicComputers() {
  if (!supabase) {
    throw new Error('Supabase client is not configured')
  }

  const { data, error } = await supabase.rpc('get_public_computer_catalog')

  if (error) {
    throw error
  }

  return (data ?? []) as unknown as PublicComputer[]
}
