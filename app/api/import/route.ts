import { NextRequest, NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'
import { parseExcelBuffer } from '@/lib/excel-parser'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = rateLimit(`import:${ip}`, 20, 10 * 60 * 1000)
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
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se envió ningún archivo.' }, { status: 400 })
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ]
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { error: 'El archivo debe ser Excel (.xlsx o .xls).' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { rows, errors, headers } = parseExcelBuffer(buffer)

    if (errors.length > 0 && rows.length === 0) {
      return NextResponse.json({ error: errors[0], headers }, { status: 422 })
    }

    const supabase = createAdminClient()
    let inserted = 0
    let skipped = 0
    let deleted = 0
    const importErrors: string[] = [...errors]

    // Deduplicar filas por numero_parte (conservar primera ocurrencia)
    const seenParts = new Set<string>()
    const dedupedRows = rows.filter((r: { numero_parte: string }) => {
      if (seenParts.has(r.numero_parte)) return false
      seenParts.add(r.numero_parte)
      return true
    })

    const excelParts = seenParts

    // ── FASE 1: Solo insertar registros nuevos ──────────────────────────────
    const BATCH_SIZE = 50
    for (let i = 0; i < dedupedRows.length; i += BATCH_SIZE) {
      const batch = dedupedRows.slice(i, i + BATCH_SIZE)
      const batchParts = batch.map((r: { numero_parte: string }) => r.numero_parte)

      const { data: existing } = await supabase
        .from('laptops')
        .select('numero_parte')
        .in('numero_parte', batchParts)

      const existingSet = new Set(
        (existing || []).map((r: { numero_parte: string }) => r.numero_parte)
      )

      const toInsert = batch.filter(
        (r: { numero_parte: string }) => !existingSet.has(r.numero_parte)
      )

      skipped += batchParts.length - toInsert.length

      if (toInsert.length === 0) continue

      const { error } = await supabase.from('laptops').insert(toInsert)

      if (error) {
        importErrors.push(`Error en lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        continue
      }

      inserted += toInsert.length
    }

    // ── FASE 2: Eliminar registros que no están en el Excel ─────────────────
    const { data: allDbRecords, error: fetchError } = await supabase
      .from('laptops')
      .select('id, numero_parte')

    if (fetchError) {
      importErrors.push(`Error al obtener registros existentes: ${fetchError.message}`)
    } else {
      const toDelete = (allDbRecords || []).filter(
        (r: { id: string; numero_parte: string }) => !excelParts.has(r.numero_parte)
      )

      for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const deleteBatch = toDelete.slice(i, i + BATCH_SIZE)
        const idsToDelete = deleteBatch.map((r: { id: string }) => r.id)
        const partsToDelete = deleteBatch.map((r: { numero_parte: string }) => r.numero_parte)

        const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif']
        const storagePaths = partsToDelete.flatMap((part: string) => {
          const safePart = part.replace(/[^a-zA-Z0-9-_]/g, '_')
          return [1, 2, 3].flatMap(slot =>
            EXTENSIONS.map(ext => `${safePart}/foto-${slot}.${ext}`)
          )
        })

        const { error: storageError } = await supabase.storage
          .from('laptop-photos')
          .remove(storagePaths)
        if (storageError) {
          importErrors.push(`Advertencia al limpiar fotos: ${storageError.message}`)
        }

        const { error: deleteError } = await supabase
          .from('laptops')
          .delete()
          .in('id', idsToDelete)

        if (deleteError) {
          importErrors.push(
            `Error al eliminar obsoletos (lote ${Math.floor(i / BATCH_SIZE) + 1}): ${deleteError.message}`
          )
          continue
        }

        deleted += deleteBatch.length
      }
    }

    return NextResponse.json({
      success: true,
      total: dedupedRows.length,
      inserted,
      skipped,
      deleted,
      errors: importErrors,
    })
  } catch (err) {
    console.error('[/api/import]', err)
    return NextResponse.json(
      { error: 'Error interno al procesar el archivo.' },
      { status: 500 }
    )
  }
}
