import * as XLSX from 'xlsx'

export type ExcelRow = {
  numero_parte: string   // CODIGO del proveedor (W06264, W02666...)
  part_number:  string | null  // PART NUMBER del fabricante
  descripcion:  string | null
  precio:       number | null
  condicion:    string | null
  estado:       string | null
  marca:        string | null
}

// ─── Detectar marca desde la descripción ────────────────────────────────────
const BRAND_RULES: Array<{ test: RegExp; brand: string }> = [
  { test: /\bLENOVO\b/i,            brand: 'Lenovo'  },
  { test: /\bASUS\b/i,              brand: 'Asus'    },
  { test: /\bDELL\b/i,              brand: 'Dell'    },
  { test: /\bACER\b/i,              brand: 'Acer'    },
  { test: /\bMSI\b/i,               brand: 'MSI'     },
  { test: /^HP[\s\-]|[\s]HP[\s\-]/i, brand: 'HP'    },
  { test: /\bAPPLE\b|\bIPAD\b|\bMACBOOK\b/i, brand: 'Apple' },
  { test: /\bJBL\b/i,               brand: 'JBL'     },
  { test: /\bONN\b/i,               brand: 'ONN'     },
  { test: /\bSAMSUNG\b/i,           brand: 'Samsung' },
  { test: /\bMICROSOFT\b|\bSURFACE\b/i, brand: 'Microsoft' },
  { test: /\bLG\b/i,                brand: 'LG'      },
  { test: /\bTOSHIBA\b/i,           brand: 'Toshiba' },
  { test: /\bSONY\b/i,              brand: 'Sony'    },
]

function extractBrand(descripcion: string): string | null {
  for (const { test, brand } of BRAND_RULES) {
    if (test.test(descripcion)) return brand
  }
  return null
}

// ─── Parsear precio ──────────────────────────────────────────────────────────
function parsePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const str = String(value).replace(/[$,\s]/g, '')
  const num = parseFloat(str)
  return isNaN(num) || num <= 0 ? null : num
}

// ─── Limpiar texto ───────────────────────────────────────────────────────────
function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).replace(/^\s+|\s+$/g, '').replace(/\t/g, '').trim()
  return s || null
}

// ─── Detectar si una fila es un producto real ────────────────────────────────
// Un producto tiene: CODIGO que empieza con W (ej. W06264) y precio numérico
function isProductRow(row: unknown[]): boolean {
  const col0 = clean(row[0])
  const col3 = row[3]
  if (!col0) return false
  // El CODIGO siempre empieza con W seguido de dígitos
  if (!/^W\d{4,6}$/i.test(col0)) return false
  const price = parsePrice(col3)
  return price !== null
}

// ─── Parsear buffer del Excel ────────────────────────────────────────────────
export function parseExcelBuffer(buffer: Buffer): {
  rows:    ExcelRow[]
  errors:  string[]
  headers: string[]
} {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  const rawData: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header:     1,
    defval:     '',
    blankrows:  false,
  })

  if (rawData.length < 2) {
    return { rows: [], errors: ['El archivo Excel está vacío o no tiene datos.'], headers: [] }
  }

  // Intentar detectar el formato: ¿tiene columnas estándar en la primera fila?
  const firstRow = rawData[0] as string[]
  const firstRowText = firstRow.map(c => String(c).toLowerCase().trim()).join('|')

  const usesStandardFormat = firstRowText.includes('codigo') || firstRowText.includes('part number')

  if (usesStandardFormat) {
    return parseFormatConCodigo(rawData)
  } else {
    return parseFormatoFlexible(rawData)
  }
}

// ─── Formato del proveedor: CODIGO | PART NUMBER | DESCRIPCION | PRECIO | CONDICION | STATUS
// Con múltiples filas de encabezado repetidas y filas de categoría intermedias
function parseFormatConCodigo(rawData: unknown[][]): {
  rows: ExcelRow[]; errors: string[]; headers: string[]
} {
  const rows: ExcelRow[] = []
  const errors: string[] = []
  const headers = ['CODIGO', 'PART NUMBER', 'DESCRIPCION', 'PRECIO', 'CONDICION', 'STATUS']

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i] as unknown[]
    if (!isProductRow(row)) continue

    const codigo      = clean(row[0])!
    const partNumber  = clean(row[1])
    const descripcion = clean(row[2])
    const precio      = parsePrice(row[3])
    const condicion   = clean(row[4])
    const estado      = clean(row[5])
    const marca       = descripcion ? extractBrand(descripcion) : null

    rows.push({
      numero_parte: codigo,
      part_number:  partNumber,
      descripcion,
      precio,
      condicion,
      estado,
      marca,
    })
  }

  if (rows.length === 0) {
    errors.push(
      'No se encontraron productos. El archivo debe tener una columna CODIGO con valores como W06264 y una columna de precio.'
    )
  }

  return { rows, errors, headers }
}

// ─── Formato flexible (encabezado único con nombres de columna variables)
const COLUMN_MAP: Record<string, keyof Omit<ExcelRow, 'marca'>> = {
  'numero de parte':  'numero_parte',
  'numero_parte':     'numero_parte',
  'no. parte':        'numero_parte',
  'no parte':         'numero_parte',
  'codigo':           'numero_parte',
  'sku':              'numero_parte',

  'part number':      'part_number',
  'part_number':      'part_number',
  'part#':            'part_number',

  'descripcion':      'descripcion',
  'descripción':      'descripcion',
  'description':      'descripcion',
  'detalle':          'descripcion',

  'precio':           'precio',
  'price':            'precio',
  'costo':            'precio',
  'precio unitario':  'precio',
  'precio incluido igv': 'precio',

  'condicion':        'condicion',
  'condición':        'condicion',
  'condition':        'condicion',

  'estado':           'estado',
  'status':           'estado',
  'disponibilidad':   'estado',
}

function parseFormatoFlexible(rawData: unknown[][]): {
  rows: ExcelRow[]; errors: string[]; headers: string[]
} {
  const headerRow = rawData[0] as string[]
  const headers   = headerRow.map(h => String(h))

  const colMap: Record<number, keyof Omit<ExcelRow, 'marca'>> = {}
  headers.forEach((h, idx) => {
    const normalized = String(h).toLowerCase().trim()
    if (COLUMN_MAP[normalized]) colMap[idx] = COLUMN_MAP[normalized]
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
    const row = rawData[i] as unknown[]
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
