import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

const ALLOWED_EVENTS = new Set([
  'whatsapp_click',
  'email_click',
  'product_view',
  'search_used',
  'filters_opened',
])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name : ''

    if (!ALLOWED_EVENTS.has(name)) {
      return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 })
    }

    const path    = typeof body?.path    === 'string' ? body.path    : null
    const payload = body?.payload && typeof body.payload === 'object' ? body.payload : null

    const supabase = createAdminClient()
    await supabase.from('store_events').insert({ name, path, payload })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/events]', error)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
