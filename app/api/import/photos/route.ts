import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { requireAdminRequest } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const BUCKET = 'laptop-photos'
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB
const FETCH_TIMEOUT_MS = 10_000

const PARTE_COLS = ['numero_parte', 'codigo', 'code', 'part']
const FOTO_COLS: Record<number, string[]> = {
  1: ['foto_1', 'url_1', 'image_1', 'photo_1', 'url foto 1', 'foto1', 'url1'],
  2: ['foto_2', 'url_2', 'image_2', 'photo_2', 'url foto 2', 'foto2', 'url2'],
  3: ['foto_3', 'url_3', 'image_3', 'photo_3', 'url foto 3', 'foto3', 'url3'],
}
const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
}

type PhotoRow = {
  numero_parte: string
  foto_1?: string
  foto_2?: string
  foto_3?: string
}

function parsePhotoImportBuffer(buffer: Buffer): { rows: PhotoRow[]; error?: string } {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  })

  if (raw.length < 2) return { rows: [], error: 'El archivo está vacío o no tiene datos.' }

  const headers = (raw[0] as string[]).map(h => String(h).toLowerCase().trim())

  const parteIdx = headers.findIndex(h => PARTE_COLS.includes(h))
  if (parteIdx === -1) {
    return {
      rows: [],
      error: `No se encontró columna de código. Columnas detectadas: ${headers.filter(Boolean).join(', ')}`,
    }
  }

  const fotoIdx: Record<number, number> = {}
  for (const slot of [1, 2, 3]) {
    const idx = headers.findIndex(h => FOTO_COLS[slot].includes(h))
    if (idx !== -1) fotoIdx[slot] = idx
  }

  const rows: PhotoRow[] = []
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[]
    const parte = String(row[parteIdx] ?? '').trim()
    if (!parte) continue

    const entry: PhotoRow = { numero_parte: parte }
    for (const slot of [1, 2, 3] as const) {
      if (fotoIdx[slot] !== undefined) {
        const url = String(row[fotoIdx[slot]] ?? '').trim()
        if (url) entry[`foto_${slot}`] = url
      }
    }
    rows.push(entry)
  }

  return { rows }
}

async function fetchImage(
  url: string,
): Promise<{ buffer: Buffer; ext: string } | { error: string }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) return { error: `HTTP ${res.status}` }

    const contentType = res.headers.get('content-type')?.split(';')[0].trim() ?? ''
    const ext = CONTENT_TYPE_EXT[contentType]
    if (!ext) return { error: `Tipo de imagen no soportado (${contentType || 'desconocido'})` }

    const arrayBuffer = await res.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      return { error: `Imagen demasiado grande (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB, máx 10MB)` }
    }

    return { buffer: Buffer.from(arrayBuffer), ext }
  } catch (err) {
    clearTimeout(timeoutId)
    const msg = err instanceof Error && err.name === 'AbortError' ? 'timeout (10s)' : 'URL inaccesible'
    return { error: msg }
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = rateLimit(`import-photos:${ip}`, 10, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Demasiadas solicitudes. Intenta en ${rl.retryAfterSeconds}s.` },
        { status: 429 },
      )
    }

    const admin = await requireAdminRequest(request)
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo.' }, { status: 400 })
    }

    const allowed = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
      'text/plain',
    ]
    if (!allowed.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      return NextResponse.json(
        { error: 'El archivo debe ser CSV o Excel (.csv, .xlsx, .xls).' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { rows, error: parseError } = parsePhotoImportBuffer(buffer)
    if (parseError) return NextResponse.json({ error: parseError }, { status: 422 })
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron filas con datos.' }, { status: 422 })
    }

    const supabase = createAdminClient()
    let fotosActualizadas = 0
    const errores: string[] = []

    // Obtener las fotos actuales de todos los equipos del archivo en una sola consulta
    const allPartes = rows.map(r => r.numero_parte)
    const { data: existingLaptops } = await supabase
      .from('laptops')
      .select('numero_parte, foto_1, foto_2, foto_3')
      .in('numero_parte', allPartes)

    const existingMap = new Map(
      (existingLaptops || []).map(l => [l.numero_parte, l])
    )

    for (const row of rows) {
      const safePart = row.numero_parte.replace(/[^a-zA-Z0-9-_]/g, '_')
      const dbUpdates: Record<string, string> = {}
      const existing = existingMap.get(row.numero_parte)

      for (const slot of [1, 2, 3] as const) {
        const url = row[`foto_${slot}`]
        if (!url) continue

        // Si ya tiene foto en este slot, ignorar
        if (existing?.[`foto_${slot}`]) continue

        const result = await fetchImage(url)
        if ('error' in result) {
          errores.push(`${row.numero_parte} foto_${slot}: ${result.error}`)
          continue
        }

        const storagePath = `${safePart}/foto-${slot}.${result.ext}`
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, result.buffer, {
            contentType: `image/${result.ext === 'jpg' ? 'jpeg' : result.ext}`,
            upsert: true,
          })

        if (uploadError) {
          errores.push(`${row.numero_parte} foto_${slot}: error al subir (${uploadError.message})`)
          continue
        }

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
        dbUpdates[`foto_${slot}`] = urlData.publicUrl
        fotosActualizadas++
      }

      if (Object.keys(dbUpdates).length > 0) {
        const { error: dbError } = await supabase
          .from('laptops')
          .update(dbUpdates)
          .eq('numero_parte', row.numero_parte)

        if (dbError) {
          errores.push(`${row.numero_parte}: error al guardar en BD (${dbError.message})`)
          fotosActualizadas -= Object.keys(dbUpdates).length
        }
      }
    }

    return NextResponse.json({
      success: true,
      total_filas: rows.length,
      fotos_actualizadas: fotosActualizadas,
      errores,
    })
  } catch (err) {
    console.error('[POST /api/import/photos]', err)
    return NextResponse.json({ error: 'Error interno al procesar el archivo.' }, { status: 500 })
  }
}
