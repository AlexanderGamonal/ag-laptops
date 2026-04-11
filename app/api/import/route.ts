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
    let updated = 0
    const importErrors: string[] = [...errors]

    // Upsert en lotes de 50
    const BATCH_SIZE = 50
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const batchParts = batch.map((r: { numero_parte: string }) => r.numero_parte)

      // Determinar cuáles ya existen ANTES del upsert
      const { data: existing } = await supabase
        .from('laptops')
        .select('numero_parte')
        .in('numero_parte', batchParts)

      const existingSet = new Set((existing || []).map((r: { numero_parte: string }) => r.numero_parte))

      const { error } = await supabase
        .from('laptops')
        .upsert(batch, {
          onConflict: 'numero_parte',
          ignoreDuplicates: false,
        })

      if (error) {
        importErrors.push(`Error en lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        continue
      }

      for (const part of batchParts) {
        if (existingSet.has(part)) {
          updated++
        } else {
          inserted++
        }
      }
    }

    return NextResponse.json({
      success: true,
      total: rows.length,
      inserted,
      updated,
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
