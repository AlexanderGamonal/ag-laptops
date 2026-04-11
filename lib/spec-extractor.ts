/**
 * Extrae specs estructuradas desde una descripción de texto libre.
 * Diseñado para las descripciones del proveedor (LENOVO, ASUS, HP, Dell, Acer, MSI, JBL, Apple, ONN).
 */

export type Specs = {
  processor:    string | null   // "AMD Ryzen 7 7445HS", "Intel Core i7-14650HX", etc.
  processor_family: string | null // "Ryzen 7", "Core i7", "Core Ultra 9"
  ram_gb:       number | null   // 8, 16, 32, 64
  storage:      string | null   // "512GB SSD", "1TB SSD"
  screen_in:    number | null   // 13.3, 14, 15.6, 16, 17.3
  screen_details: string | null // "IPS · FHD · 144Hz", etc.
  front_camera: string | null   // "12MP Front Camera"
  back_camera: string | null    // "12MP Back Camera"
  connectivity: string | null   // "Wi-Fi 6"
  color: string | null          // "Silver"
  gpu:          string | null   // "NVIDIA GeForce RTX 4050 6144MB", etc.
  gpu_family:   string | null   // "RTX 4050", "RX 7600M", "Arc A530M"
  has_dedicated_gpu: boolean    // true si tiene GPU dedicada
}

function cleanText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[™®©°]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Normalizar texto (quita ™ ® © y acentos) ───────────────────────────────
export function normalizeText(text: string): string {
  return cleanText(text).toLowerCase()
}

// ─── Procesador ──────────────────────────────────────────────────────────────
function extractProcessorFamily(text: string): string | null {
  const t = normalizeText(text)

  // Core Ultra (ej: "Core Ultra 9 275H", "Core Ultra 7 155U")
  if (/\bcore\s*ultra\s*9\b/.test(t)) return 'Core Ultra 9'
  if (/\bcore\s*ultra\s*7\b/.test(t)) return 'Core Ultra 7'
  if (/\bcore\s*ultra\s*5\b/.test(t)) return 'Core Ultra 5'

  // Core i-series (ej: "Core i7-14700HX", "Corei7-1255U", "Core i5")
  if (/\bcore\s*i9\b/.test(t)) return 'Core i9'
  if (/\bcore\s*i7\b/.test(t)) return 'Core i7'
  if (/\bcore\s*i5\b/.test(t)) return 'Core i5'
  if (/\bcore\s*i3\b/.test(t)) return 'Core i3'

  // AMD Ryzen AI (ej: "Ryzen AI 9 270", "Ryzen AI 7 350")
  if (/\bryzen\s*ai\s*9\b/.test(t)) return 'Ryzen AI 9'
  if (/\bryzen\s*ai\s*7\b/.test(t)) return 'Ryzen AI 7'
  if (/\bryzen\s*ai\s*5\b/.test(t)) return 'Ryzen AI 5'

  // AMD Ryzen estándar (ej: "Ryzen 9 7945", "Ryzen 7 7445HS")
  if (/\bryzen\s*9\b/.test(t)) return 'Ryzen 9'
  if (/\bryzen\s*7\b/.test(t)) return 'Ryzen 7'
  if (/\bryzen\s*5\b/.test(t)) return 'Ryzen 5'

  // Cortex (chips ARM en dispositivos ONN)
  const cortex = t.match(/\bcortex[-\s]*(a\d+)\b/i)
  if (cortex) return `Cortex ${cortex[1].toUpperCase()}`

  // Apple Silicon / Bionic / A-series
  if (/\bapple\s*m4\b/.test(t)) return 'Apple M4'
  if (/\bapple\s*m3\b/.test(t)) return 'Apple M3'
  if (/\bapple\s*m2\b/.test(t)) return 'Apple M2'
  if (/\bapple\s*m1\b/.test(t)) return 'Apple M1'
  if (/\bapple\s*a18\b/.test(t)) return 'Apple A18'
  if (/\bapple\s*a17\b/.test(t)) return 'Apple A17'
  if (/\bapple\s*a16\b/.test(t)) return 'Apple A16'
  if (/\bapple\s*a15\b/.test(t)) return 'Apple A15'
  if (/\bapple\s*a14\b/.test(t)) return 'Apple A14'

  return null
}

// ─── RAM ─────────────────────────────────────────────────────────────────────
function extractRam(text: string): number | null {
  const t = normalizeText(text)

  // Prioridad: buscar explícitamente DDR o LPDDR  (distingue RAM de almacenamiento)
  const ddrMatch = t.match(/(\d+)\s*gb\s*(ddr[0-9]?x?|lpddr[0-9]?)\b/)
  if (ddrMatch) return parseInt(ddrMatch[1])

  // "16GB RAM" / "16 GB RAM"
  const ramMatch = t.match(/(\d+)\s*gb\s*ram\b/)
  if (ramMatch) return parseInt(ramMatch[1])

  // " 16GB " inmediatamente después de almacenamiento (segundo GB grande)
  // Estrategia: encontrar todos los GB y el último antes de un espacio/coma (sin SSD/TB/HDD)
  // Excluir patrones de almacenamiento: NGB SSD / NGB HDD / NTB / STORAGE
  // Reemplazar solo el bloque de almacenamiento (sin ser codicioso)
  const storageReplaced = t
    .replace(/\d+\s*(gb|tb)\s*(ssd|hdd|nvme|storage|m\.2|m2)\b/gi, '__STORAGE__')
    .replace(/\d+\s*tb\b/gi, '__STORAGE__')

  const ramFallback = storageReplaced.match(/(\d+)\s*gb\b/)
  if (ramFallback) {
    const val = parseInt(ramFallback[1])
    // Valores típicos de RAM (máx 64 para evitar confundir con storage de iPads/tablets)
    if ([4, 6, 8, 12, 16, 24, 32, 48, 64].includes(val)) return val
  }

  return null
}

// ─── Almacenamiento ──────────────────────────────────────────────────────────
function extractStorage(text: string): string | null {
  const t = normalizeText(text)

  // "1TB SSD" / "1 TB SSD"
  const tbSsd = t.match(/(\d+)\s*tb\s*(ssd|nvme|hdd|m\.2|m2|storage)?/)
  if (tbSsd) return `${tbSsd[1]}TB SSD`

  // "512GB SSD" / "512 GB SSD" / "256GB NVMe"
  const gbSsd = t.match(/(\d+)\s*gb\s*(ssd|nvme|hdd|m\.2|m2|storage)/)
  if (gbSsd) {
    const val = parseInt(gbSsd[1])
    // Valores típicos de almacenamiento: 64, 128, 256, 512
    if (val >= 64) return `${val}GB SSD`
  }

  // Apple / tablets: "A16 128GB 11"..." o "M2 256GB ..."
  const standaloneGb = t.match(/\b(?:apple\s+)?(?:a1[4-8]|m[1-4])\s+(\d+)\s*gb\b/i)
  if (standaloneGb) {
    const val = parseInt(standaloneGb[1], 10)
    if (val >= 64) return `${val}GB`
  }

  // Fallback para tablets/dispositivos sin SSD explícito:
  // elegir el mayor valor de GB si no parece RAM.
  const gbValues = Array.from(t.matchAll(/\b(\d+)\s*gb\b/gi))
    .map(match => parseInt(match[1], 10))
    .filter(value => value >= 64)
    .sort((a, b) => b - a)
  if (gbValues.length > 0) return `${gbValues[0]}GB`

  return null
}

// ─── Tamaño de pantalla ──────────────────────────────────────────────────────
function extractScreen(text: string): number | null {
  const t = normalizeText(text)

  // Patrón: "15.6"" o "16"" o "14 inch" — pero evitar capturar años o números de modelo
  const patterns = [
    /(\d{2}\.?\d*)\s*["″]/g,                    // 15.6" / 16"
    /(\d{2}\.?\d*)[- ]?inch/gi,                  // 15.6-inch / 14 inch
    /(\d{2}\.?\d*)[- ]?in\b/gi,                  // 16 in
  ]

  const VALID_SIZES = [10.9, 11, 11.6, 12, 12.3, 12.5, 13, 13.3, 13.4, 14, 14.5, 15, 15.6, 16, 17, 17.3, 18]

  for (const pattern of patterns) {
    let m: RegExpExecArray | null
    while ((m = pattern.exec(t)) !== null) {
      const val = parseFloat(m[1])
      if (VALID_SIZES.includes(val) || (val >= 10 && val <= 18)) {
        return val
      }
    }
  }
  return null
}

function extractProcessor(text: string): string | null {
  const source = cleanText(text)

  let match = source.match(/\b(AMD\s+)?Ryzen\s+AI\s+(9|7|5)\s+([0-9]{3,4}[A-Z]{0,3})\b/i)
  if (match) return `AMD Ryzen AI ${match[2]} ${match[3].toUpperCase()}`

  match = source.match(/\b(AMD\s+)?Ryzen\s+(9|7|5)\s+([0-9]{3,4}[A-Z]{0,3})\b/i)
  if (match) return `AMD Ryzen ${match[2]} ${match[3].toUpperCase()}`

  match = source.match(/\b(Intel\s+)?Core\s+Ultra\s+(9|7|5)\s+([0-9]{3,4}[A-Z]{0,3})\b/i)
  if (match) return `Intel Core Ultra ${match[2]} ${match[3].toUpperCase()}`

  match = source.match(/\b(Intel\s+)?Core\s*i(9|7|5|3)\s*-?\s*([0-9]{4,5}[A-Z]{0,3})\b/i)
  if (match) return `Intel Core i${match[2]}-${match[3].toUpperCase()}`

  match = source.match(/\bCore\s+(9|7|5)\s+([0-9]{3,4}[A-Z]{0,3})\b/i)
  if (match) return `Intel Core ${match[1]} ${match[2].toUpperCase()}`

  match = source.match(/\bCortex[-\s]*(A\d+)\b/i)
  if (match) return `Cortex ${match[1].toUpperCase()}`

  match = source.match(/\bApple\s+(M[1-4]|A1[4-8])\b/i)
  if (match) return `Apple ${match[1].toUpperCase()}`

  return extractProcessorFamily(text)
}

function extractScreenDetails(text: string): string | null {
  const t = normalizeText(text)
  const source = cleanText(text)
  const details: string[] = []

  const resolution = source.match(/\b(\d{3,4}\s*x\s*\d{3,4})\b/i)
  if (resolution) details.push(`(${resolution[1].replace(/\s+/g, '')})`)

  if (/\bliquid retina xdr\b/.test(t)) details.push('Liquid Retina XDR')
  else if (/\bliquid retina\b/.test(t)) details.push('Liquid Retina')
  else if (/\bretina\b/.test(t)) details.push('Retina')
  else if (/\bsuper retina xdr\b/.test(t)) details.push('Super Retina XDR')

  if (/\boled\b/.test(t)) details.push('OLED')
  else if (/\bips\b/.test(t)) details.push('IPS')
  else if (/\bled\b/.test(t)) details.push('LED')

  if (/\b4k\b|\buhd\b/.test(t)) details.push('UHD')
  else if (/\b3k\b/.test(t)) details.push('3K')
  else if (/\b2\.?8k\b/.test(t)) details.push('2.8K')
  else if (/\b2k\b|\bqhd\b/.test(t)) details.push('QHD')
  else if (/\bwuxga\b/.test(t)) details.push('WUXGA')
  else if (/\bfhd\b|\bfull hd\b/.test(t)) details.push('FHD')
  else if (/\bhd\b/.test(t)) details.push('HD')

  const hz = t.match(/(\d{2,3})\s*hz\b/)
  if (hz) details.push(`${hz[1]}Hz`)

  if (/\btouch\b|\btactil\b/.test(t)) details.push('Touch')
  if (/\banti-?glare\b/.test(t)) details.push('Anti-glare')

  return details.length > 0 ? details.join(' · ') : null
}

function extractFrontCamera(text: string): string | null {
  const source = cleanText(text)
  const match = source.match(/\b(\d{1,3}\s*MP)\s*Front\s*Camera\b/i)
  return match ? `${match[1].toUpperCase().replace(/\s+/g, '')} Front Camera` : null
}

function extractBackCamera(text: string): string | null {
  const source = cleanText(text)
  const match = source.match(/\b(\d{1,3}\s*MP)\s*Back\s*Camera\b/i)
  return match ? `${match[1].toUpperCase().replace(/\s+/g, '')} Back Camera` : null
}

function extractConnectivity(text: string): string | null {
  const source = cleanText(text)
  const wifi = source.match(/\bWi-?Fi\s*(6E|6|7|5)\b/i)
  if (wifi) return `Wi-Fi ${wifi[1].toUpperCase()}`
  return null
}

function extractColor(text: string): string | null {
  const source = cleanText(text)
  const colors = [
    'Silver',
    'Space Gray',
    'Gray',
    'Midnight',
    'Starlight',
    'Blue',
    'Purple',
    'Pink',
    'Yellow',
    'Black',
    'White',
    'Green',
    'Rose Gold',
    'Gold',
    'Jaegar Gray',
  ]

  for (const color of colors) {
    const pattern = new RegExp(`\\b${color.replace(/\s+/g, '\\s+')}\\b`, 'i')
    if (pattern.test(source)) return color
  }

  const trailingColor = source.match(/\b([A-Z][A-Z\s]{2,20})$/)
  if (trailingColor) {
    return trailingColor[1]
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase())
  }

  return null
}

// ─── GPU dedicada ────────────────────────────────────────────────────────────
function extractGpuFamily(text: string): string | null {
  const t = normalizeText(text)

  // NVIDIA RTX / GTX
  let m = t.match(/\b(rtx|gtx)\s*(\d{3,4}[ti]*)\b/i)
  if (m) return `${m[1].toUpperCase()} ${m[2]}`

  // AMD Radeon RX
  m = t.match(/\b(rx|radeon\s*rx)\s*(\d{3,4}[a-z]*)\b/i)
  if (m) return `RX ${m[2].toUpperCase()}`

  // Intel Arc
  m = t.match(/\barc\s*(a\d{3}[a-z]*)\b/i)
  if (m) return `Arc ${m[1].toUpperCase()}`

  return null
}

function extractGpu(text: string): string | null {
  const source = cleanText(text)

  let match = source.match(/\b(NVIDIA(?:\s+GeForce)?|GeForce|RTX|GTX)\s*(RTX|GTX)?\s*(\d{3,4}(?:\s*TI|TI)?[A-Z]*)\s*(\d{3,5}\s*(?:MB|GB))?\b/i)
  if (match) {
    const family = (match[2] || (/gtx/i.test(match[1]) ? 'GTX' : 'RTX')).toUpperCase()
    const memory = match[4] ? ` ${match[4].toUpperCase().replace(/\s+/g, '')}` : ''
    return `NVIDIA GeForce ${family} ${match[3].toUpperCase().replace(/\s+/g, '')}${memory}`
  }

  match = source.match(/\b(AMD\s+)?(?:Radeon\s+)?RX\s*(\d{3,4}[A-Z]*)\s*(\d{1,2}\s*(?:GB|MB))?\b/i)
  if (match) {
    const memory = match[3] ? ` ${match[3].toUpperCase().replace(/\s+/g, '')}` : ''
    return `AMD Radeon RX ${match[2].toUpperCase()}${memory}`
  }

  match = source.match(/\bIntel\s+Arc\s*(A\d{3}[A-Z]*)\s*(\d{1,2}\s*(?:GB|MB))?\b/i) || source.match(/\bArc\s*(A\d{3}[A-Z]*)\s*(\d{1,2}\s*(?:GB|MB))?\b/i)
  if (match) {
    const memory = match[2] ? ` ${match[2].toUpperCase().replace(/\s+/g, '')}` : ''
    return `Intel Arc ${match[1].toUpperCase()}${memory}`
  }

  return extractGpuFamily(text)
}

// ─── Función principal ───────────────────────────────────────────────────────
export function extractSpecs(descripcion: string | null): Specs {
  if (!descripcion) {
    return {
      processor: null,
      processor_family: null,
      ram_gb: null,
      storage: null,
      screen_in: null,
      screen_details: null,
      front_camera: null,
      back_camera: null,
      connectivity: null,
      color: null,
      gpu: null,
      gpu_family: null,
      has_dedicated_gpu: false,
    }
  }

  const gpu = extractGpu(descripcion)
  return {
    processor:         extractProcessor(descripcion),
    processor_family:  extractProcessorFamily(descripcion),
    ram_gb:            extractRam(descripcion),
    storage:           extractStorage(descripcion),
    screen_in:         extractScreen(descripcion),
    screen_details:    extractScreenDetails(descripcion),
    front_camera:      extractFrontCamera(descripcion),
    back_camera:       extractBackCamera(descripcion),
    connectivity:      extractConnectivity(descripcion),
    color:             extractColor(descripcion),
    gpu,
    gpu_family:        extractGpuFamily(descripcion),
    has_dedicated_gpu: gpu !== null,
  }
}

// ─── Etiqueta de pantalla ────────────────────────────────────────────────────
export function screenLabel(inches: number): string {
  return `${inches}"`
}

// ─── Etiqueta de RAM ─────────────────────────────────────────────────────────
export function ramLabel(gb: number): string {
  return `${gb}GB RAM`
}
