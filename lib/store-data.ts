import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { unstable_noStore as noStore } from 'next/cache'
import type { Laptop } from '@/lib/supabase'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/server-env'

function createStoreClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function getPublicLaptops() {
  noStore()
  const supabase = createStoreClient()
  const { data, error } = await supabase
    .from('laptops')
    .select('*')
    .eq('activo', true)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Unable to fetch laptops: ${error.message}`)
  }

  return (data || []) as Laptop[]
}

export async function getPublicLaptopById(id: string) {
  noStore()
  const supabase = createStoreClient()
  const { data, error } = await supabase
    .from('laptops')
    .select('*')
    .eq('id', id)
    .eq('activo', true)
    .single()

  if (error) {
    return null
  }

  return data as Laptop
}
