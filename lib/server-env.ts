import 'server-only'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getSupabaseUrl() {
  return required('NEXT_PUBLIC_SUPABASE_URL')
}

export function getSupabaseAnonKey() {
  return required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export function getSupabaseServiceRoleKey() {
  return required('SUPABASE_SERVICE_ROLE_KEY')
}

export function getStoreName() {
  return process.env.NEXT_PUBLIC_STORE_NAME || 'TechLaptops'
}

export function getStoreEmail() {
  return process.env.NEXT_PUBLIC_CONTACT_EMAIL || ''
}

export function getWhatsAppNumber() {
  return (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, '')
}

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}
