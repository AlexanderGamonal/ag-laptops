import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { createClient, type User } from '@supabase/supabase-js'
import { ADMIN_SESSION_COOKIE } from '@/lib/auth-constants'
import { getAdminEmails, getSupabaseAnonKey, getSupabaseUrl } from '@/lib/server-env'

function createAuthClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

function isAllowedAdmin(email?: string | null) {
  if (!email) return false
  const admins = getAdminEmails()
  return admins.length > 0 && admins.includes(email.toLowerCase())
}

export async function getAdminUserFromToken(accessToken?: string | null): Promise<User | null> {
  if (!accessToken) return null

  const supabase = createAuthClient()
  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user || !isAllowedAdmin(data.user.email)) {
    return null
  }

  return data.user
}

export async function requireAdminRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const cookieToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? null
  const user = await getAdminUserFromToken(bearerToken || cookieToken)

  if (!user) {
    return null
  }

  return user
}

export async function requireAdminPage() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value
  const user = await getAdminUserFromToken(token)

  if (!user) {
    redirect('/admin/login')
  }

  return user
}
