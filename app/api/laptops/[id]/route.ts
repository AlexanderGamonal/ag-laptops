import { NextRequest, NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminRequest(request)
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('laptops')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Laptop no encontrada.' }, { status: 404 })
    }

    return NextResponse.json({ laptop: data })
  } catch (err) {
    console.error('[GET /api/laptops/[id]]', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminRequest(request)
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const supabase = createAdminClient()

    const allowedFields = ['activo', 'descripcion', 'precio', 'condicion', 'estado', 'marca', 'part_number']
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('laptops')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ laptop: data })
  } catch (err) {
    console.error('[PATCH /api/laptops/[id]]', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminRequest(request)
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createAdminClient()

    const { data: laptop } = await supabase
      .from('laptops')
      .select('numero_parte')
      .eq('id', id)
      .single()

    if (laptop?.numero_parte) {
      const safePart = laptop.numero_parte.replace(/[^a-zA-Z0-9-_]/g, '_')
      const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
      const paths = [1, 2, 3].flatMap(slot =>
        extensions.map(ext => `${safePart}/foto-${slot}.${ext}`)
      )
      await supabase.storage.from('laptop-photos').remove(paths)
    }

    const { error } = await supabase
      .from('laptops')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/laptops/[id]]', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
