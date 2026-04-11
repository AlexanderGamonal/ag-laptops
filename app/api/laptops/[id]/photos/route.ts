import { NextRequest, NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const BUCKET = 'laptop-photos'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 5

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ip = getClientIp(request)
    const rl = rateLimit(`photos:${ip}`, 60, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Demasiadas solicitudes. Intenta de nuevo en ${rl.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const admin = await requireAdminRequest(request)
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file    = formData.get('file') as File | null
    const slot    = formData.get('slot') as string | null // '1', '2', o '3'

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo.' }, { status: 400 })
    }
    if (!slot || !['1', '2', '3'].includes(slot)) {
      return NextResponse.json({ error: 'Slot inválido. Debe ser 1, 2 o 3.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Use JPG, PNG o WebP.' },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `El archivo no puede superar ${MAX_SIZE_MB}MB.` },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Obtener la laptop para usar el numero_parte como ruta
    const { data: laptop, error: laptopError } = await supabase
      .from('laptops')
      .select('id, numero_parte')
      .eq('id', params.id)
      .single()

    if (laptopError || !laptop) {
      return NextResponse.json({ error: 'Laptop no encontrada.' }, { status: 404 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safePart = laptop.numero_parte.replace(/[^a-zA-Z0-9-_]/g, '_')
    const storagePath = `${safePart}/foto-${slot}.${ext}`

    // Subir al bucket (upsert = reemplaza si ya existe)
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Obtener la URL pública
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    const publicUrl = urlData.publicUrl

    // Guardar la URL en la columna correspondiente
    const fotoField = `foto_${slot}` as 'foto_1' | 'foto_2' | 'foto_3'
    const { error: updateError } = await supabase
      .from('laptops')
      .update({ [fotoField]: publicUrl })
      .eq('id', params.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: publicUrl, slot, field: fotoField })
  } catch (err) {
    console.error('[POST /api/laptops/[id]/photos]', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdminRequest(request)
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const slot = searchParams.get('slot')

    if (!slot || !['1', '2', '3'].includes(slot)) {
      return NextResponse.json({ error: 'Slot inválido.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const fotoField = `foto_${slot}` as 'foto_1' | 'foto_2' | 'foto_3'

    // Obtener la URL actual para borrar del storage
    const { data: laptop } = await supabase
      .from('laptops')
      .select(`id, numero_parte, ${fotoField}`)
      .eq('id', params.id)
      .single()

    if (laptop) {
      const laptopData = laptop as { id: string; numero_parte: string; foto_1?: string | null; foto_2?: string | null; foto_3?: string | null }
      const currentPhoto = laptopData[fotoField as 'foto_1' | 'foto_2' | 'foto_3']
      if (currentPhoto) {
        const safePart = laptopData.numero_parte.replace(/[^a-zA-Z0-9-_]/g, '_')
        const extensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
        const paths = extensions.map(ext => `${safePart}/foto-${slot}.${ext}`)
        await supabase.storage.from(BUCKET).remove(paths)
      }
    }

    // Limpiar el campo en la DB
    const { error } = await supabase
      .from('laptops')
      .update({ [fotoField]: null })
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/laptops/[id]/photos]', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
