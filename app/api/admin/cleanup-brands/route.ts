import { NextRequest, NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

const ALLOWED = ['Lenovo', 'HP', 'Asus', 'Acer', 'Dell', 'MSI', 'Apple']

const BRAND_FIXES: Record<string, string> = {
  lenovo: 'Lenovo', LENOVO: 'Lenovo',
  hp: 'HP', Hp: 'HP',
  asus: 'Asus', ASUS: 'Asus',
  acer: 'Acer', ACER: 'Acer',
  dell: 'Dell', DELL: 'Dell',
  msi: 'MSI', Msi: 'MSI',
  apple: 'Apple', APPLE: 'Apple',
}

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif']

// GET — previsualización sin ejecutar
export async function GET(request: NextRequest) {
  const admin = await requireAdminRequest(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const supabase = createAdminClient()

  const { data: toDelete, error } = await supabase
    .from('laptops')
    .select('id, numero_parte, descripcion, marca')
    .not('marca', 'is', null)
    .filter('marca', 'not.in', `(${ALLOWED.join(',')})`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Agrupar por marca para mostrar resumen
  const byBrand: Record<string, number> = {}
  for (const item of toDelete || []) {
    const m = item.marca ?? 'Sin marca'
    byBrand[m] = (byBrand[m] ?? 0) + 1
  }

  // Contar registros con capitalización incorrecta
  let toFix = 0
  for (const wrong of Object.keys(BRAND_FIXES)) {
    const { count } = await supabase
      .from('laptops')
      .select('id', { count: 'exact', head: true })
      .eq('marca', wrong)
    toFix += count ?? 0
  }

  return NextResponse.json({
    toDelete: toDelete || [],
    byBrand,
    toFix,
    total: toDelete?.length ?? 0,
  })
}

// POST — ejecuta la limpieza
export async function POST(request: NextRequest) {
  const admin = await requireAdminRequest(request)
  if (!admin) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  const supabase = createAdminClient()
  let fixed = 0
  let deleted = 0
  const deletedBrands: string[] = []

  // ── Paso 1: Corregir capitalización ──────────────────────────────────────
  for (const [wrong, correct] of Object.entries(BRAND_FIXES)) {
    const { count } = await supabase
      .from('laptops')
      .update({ marca: correct }, { count: 'exact' })
      .eq('marca', wrong)
    fixed += count ?? 0
  }

  // ── Paso 2: Eliminar marcas no permitidas ────────────────────────────────
  const { data: toDelete, error: fetchError } = await supabase
    .from('laptops')
    .select('id, numero_parte, marca')
    .not('marca', 'is', null)
    .filter('marca', 'not.in', `(${ALLOWED.join(',')})`)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const records = toDelete || []
  const BATCH_SIZE = 50

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const ids = batch.map(r => r.id)
    const parts = batch.map(r => r.numero_parte)
    const brands = batch.map(r => r.marca).filter(Boolean) as string[]

    // Limpiar fotos en Storage
    const storagePaths = parts.flatMap(part => {
      const safePart = part.replace(/[^a-zA-Z0-9-_]/g, '_')
      return [1, 2, 3].flatMap(slot =>
        EXTENSIONS.map(ext => `${safePart}/foto-${slot}.${ext}`)
      )
    })
    await supabase.storage.from('laptop-photos').remove(storagePaths)

    // Eliminar registros
    const { error: deleteError } = await supabase
      .from('laptops')
      .delete()
      .in('id', ids)

    if (!deleteError) {
      deleted += batch.length
      deletedBrands.push(...brands)
    }
  }

  const uniqueDeletedBrands = Array.from(new Set(deletedBrands)).sort()

  return NextResponse.json({ fixed, deleted, deletedBrands: uniqueDeletedBrands })
}
