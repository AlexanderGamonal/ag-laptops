import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
let browserClient: ReturnType<typeof createClient> | null = null

// Cliente para uso en el navegador (con anon key)
export function getBrowserSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase browser client is not configured.')
  }

  browserClient ??= createClient(supabaseUrl, supabaseAnonKey)
  return browserClient
}

// Cliente con service role para operaciones admin en el servidor
// Solo usar en API routes (server-side)
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin client is not configured.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export type Laptop = {
  id: string
  numero_parte: string
  part_number: string | null
  descripcion: string | null
  precio: number | null
  condicion: string | null
  estado: string | null
  marca: string | null
  foto_1: string | null
  foto_2: string | null
  foto_3: string | null
  activo: boolean
  created_at: string
  updated_at: string
}
