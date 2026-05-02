import ExcelJS from 'exceljs'

export type ExcelRow = {
  numero_parte: string
  part_number:  string | null
  descripcion:  string | null
  precio:       number | null
  condicion:    string | null
  estado:       string | null
  marca:        string | null
}

// ─── Detectar marca desde la descripción ────────────────────────────────────
const BRAND_RULES: Array<{ test: RegExp; brand: string }> = [
  { test: /\bAMAZON\b|\bKINDLE\b|\bAMAZON\s*BASICS\b|\bFIRE\s*HD\b|\bFIRE\s*HDX\b/i, brand: 'Amazon' },
  { test: /\bLENOVO\b/i,              brand: 'Lenovo'    },
  { test: /\bASUS\b/i,                brand: 'Asus'      },
  { test: /\bDELL\b/i,                brand: 'Dell'      },
  { test: /\bACER\b/i,                brand: 'Acer'      },
  { test: /\bMSI\b/i,                 brand: 'MSI'       },
  { test: /^HP[\s\-]|[\s]HP[\s\-]/i, brand: 'HP'        },
  { test: /\bAPPLE\b|\bIPAD\b|\bMACBOOK\b/i, brand: 'Apple' },
  { test: /\bJBL\b/i,                 brand: 'JBL'       },
  { test: /\bONN\b/i,                 brand: 'ONN'       },
  { test: /\bSAMSUNG\b/i,             brand: 'Samsung'   },
  { test: /\bMICROSOFT\b|\bSURFACE\b/i, brand: 'Microsoft' },
  { test: /\bLG\b/i,                  brand: 'LG'        },
  { test: /\bTOSHIBA\b/i,             brand: 'Toshiba'   },
  { test: /\bSONY\b/i,                brand: 'Sony'      },
]

function extractBrand(descripcion: string): string | null {
  for (const { test, brand } of BRAND_RULES) {
    if (test.test(descripcion)) return brand
  }
  return null
}

// ─── Normalizar valores de celda de ExcelJS ──────────────────────────────────
// ExcelJS devuelve tipos complejos: fórmulas, rich text, hipervínculos, etc.
function cellToRaw(value: ExcelJS.CellValue): string | number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' || typeof value === 'boolean') return value as number
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    // Fórmula: { formula, result }
    if ('result' in value) return cellToRaw(value.result as ExcelJS.CellValue)
    // Rich text: { richText: [{ text }] }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((r: { text: string }) => r.text).join('')
    }
    // Hipervínculo: { text, hyperlink }
    if ('text' in value) return String(value.text)
    // Error de celda
    if ('error' in value) return null
  }
  return String(value)
}

function parsePrice(value: ExcelJS.CellValue): number | null {
  const raw = cellToRaw(value)
  if (raw === null || raw === '') return null
  const str = String(raw).replace(/[$,\s]/g, '')
  const num = parseFloat(str)
  return isNaN(num) || num <= 0 ? null : num
}

function clean(value: ExcelJS.CellValue): string | null {
  const raw = cellToRaw(value)
  if (raw === null) return null
  const s = String(raw).replace(/\t/g, '').trim()
  return s || null
}

function isProductRow(row: ExcelJS.CellValue[]): boolean {
  const col0 = clean(row[0])
  if (!col0 || !/^W\d{4,6}$/i.test(col0)) return false
  return parsePrice(row[3]) !== null
}

// ─── Leer workbook y convertir a array de arrays ─────────────────────────────
async function readWorksheet(buffer: Buffer): Promise<ExcelJS.CellValue[][]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
  const ws = workbook.worksheets[0]
  if (!ws) return []

  const rows: ExcelJS.CellValue[][] = []
  ws.eachRow({ includeEmpty: false }, (row) => {
    // row.values es 1-indexed; slice(1) elimina el primer elemento undefined
    rows.push((row.values as ExcelJS.CellValue[]).slice(1))
  })
  return rows
}

// ─── API pública ──────────────────────────────────────────────────────────────
export async function parseExcelBuffer(buffer: Buffer): Promise<{
  rows:    ExcelRow[]
  errors:  string[]
  headers: string[]
}> {
  const rawData = await readWorksheet(buffer)

  if (rawData.length < 2) {
    return { rows: [], errors: ['El archivo Excel está vacío o no tiene datos.'], headers: [] }
  }

  const firstRow = rawData[0].map(c => String(cellToRaw(c) ?? '').toLowerCase().trim())
  const firstRowText = firstRow.join('|')

  if (firstRowText.includes('codigo') || firstRowText.includes('part number')) {
    return parseFormatConCodigo(rawData)
  }
  return parseFormatoFlexible(rawData)
}

// ─── Formato del proveedor: CODIGO | PART NUMBER | DESCRIPCION | PRECIO | CONDICION | STATUS
function parseFormatConCodigo(rawData: ExcelJS.CellValue[][]): {
  rows: ExcelRow[]; errors: string[]; headers: string[]
} {
  const rows: ExcelRow[] = []
  const errors: string[] = []
  const headers = ['CODIGO', 'PART NUMBER', 'DESCRIPCION', 'PRECIO', 'CONDICION', 'STATUS']

  for (const row of rawData) {
    if (!isProductRow(row)) continue

    const codigo      = clean(row[0])!
    const partNumber  = clean(row[1])
    const descripcion = clean(row[2])
    const precio      = parsePrice(row[3])
    const condicion   = clean(row[4])
    const estado      = clean(row[5])

    rows.push({
      numero_parte: codigo,
      part_number:  partNumber,
      descripcion,
      precio,
      condicion,
      estado,
      marca: descripcion ? extractBrand(descripcion) : null,
    })
  }

  if (rows.length === 0) {
    errors.push(
      'No se encontraron productos. El archivo debe tener una columna CODIGO con valores como W06264 y una columna de precio.'
    )
  }

  return { rows, errors, headers }
}

// ─── Formato flexible ─────────────────────────────────────────────────────────
const COLUMN_MAP: Record<string, keyof Omit<ExcelRow, 'marca'>> = {
  'numero de parte':     'numero_parte',
  'numero_parte':        'numero_parte',
  'no. parte':           'numero_parte',
  'no parte':            'numero_parte',
  'codigo':              'numero_parte',
  'sku':                 'numero_parte',
  'part number':         'part_number',
  'part_number':         'part_number',
  'part#':               'part_number',
  'descripcion':         'descripcion',
  'descripción':         'descripcion',
  'description':         'descripcion',
  'detalle':             'descripcion',
  'precio':              'precio',
  'price':               'precio',
  'costo':               'precio',
  'precio unitario':     'precio',
  'precio incluido igv': 'precio',
  'condicion':           'condicion',
  'condición':           'condicion',
  'condition':           'condicion',
  'estado':              'estado',
  'status':              'estado',
  'disponibilidad':      'estado',
}

function parseFormatoFlexible(rawData: ExcelJS.CellValue[][]): {
  rows: ExcelRow[]; errors: string[]; headers: string[]
} {
  const headerRow = rawData[0]
  const headers   = headerRow.map(h => String(cellToRaw(h) ?? ''))

  const colMap: Record<number, keyof Omit<ExcelRow, 'marca'>> = {}
  headers.forEach((h, idx) => {
    const key = h.toLowerCase().trim()
    if (COLUMN_MAP[key]) colMap[idx] = COLUMN_MAP[key]
  })

  if (!Object.values(colMap).includes('numero_parte')) {
    return {
      rows: [],
      errors: [
        'No se reconoció el formato del archivo. ' +
        `Columnas encontradas: ${headers.filter(Boolean).join(', ')}. ` +
        'Se esperan columnas como: CODIGO, PART NUMBER, DESCRIPCION, PRECIO, CONDICION, STATUS.'
      ],
      headers,
    }
  }

  const rows: ExcelRow[] = []
  const errors: string[] = []

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i]
    const entry: Partial<ExcelRow> = {}

    for (const [idxStr, field] of Object.entries(colMap)) {
      const val = row[parseInt(idxStr)]
      if (field === 'precio') {
        entry.precio = parsePrice(val)
      } else {
        entry[field] = clean(val) ?? undefined
      }
    }

    if (!entry.numero_parte) continue

    const descripcion = entry.descripcion ?? null
    rows.push({
      numero_parte: entry.numero_parte,
      part_number:  entry.part_number  ?? null,
      descripcion,
      precio:       entry.precio       ?? null,
      condicion:    entry.condicion    ?? null,
      estado:       entry.estado       ?? null,
      marca:        descripcion ? extractBrand(descripcion) : null,
    })
  }

  if (rows.length === 0) {
    errors.push('No se encontraron filas de productos en el archivo.')
  }

  return { rows, errors, headers }
}
