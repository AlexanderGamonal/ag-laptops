import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { parseExcelBuffer } from '@/lib/excel-parser'

export async function POST(request: NextRequest) {
  try {
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

      const { data, error } = await supabase
        .from('laptops')
        .upsert(batch, {
          onConflict: 'numero_parte',
          ignoreDuplicates: false,
        })
        .select('id, numero_parte, created_at, updated_at')

      if (error) {
        importErrors.push(`Error en lote ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
        continue
      }

      // Contar nuevos vs actualizados comparando timestamps
      if (data) {
        const now = Date.now()
        for (const row of data) {
          const createdAt = new Date(row.created_at).getTime()
          if (now - createdAt < 5000) {
            inserted++
          } else {
            updated++
          }
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
