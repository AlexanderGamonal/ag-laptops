/**
 * Extrae specs estructuradas desde una descripción de texto libre.
 * Diseñado para las descripciones del proveedor (LENOVO, ASUS, HP, Dell, Acer, MSI, JBL, Apple, ONN).
 */

export type Specs = {
  processor:    string | null   // "Core i7", "Ryzen 7", "Core Ultra 9", etc.
  ram_gb:       number | null   // 8, 16, 32, 64
  storage:      string | null   // "512GB SSD", "1TB SSD"
  screen_in:    number | null   // 13.3, 14, 15.6, 16, 17.3
  gpu:          string | null   // "RTX 4060", "RX 7600M", "Arc A530M"
  has_dedicated_gpu: boolean    // true si tiene GPU dedicada
}

// ─── Normalizar texto (quita ™ ® © y acentos) ───────────────────────────────
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // quitar acentos (é→e, á→a, etc.)
    .replace(/[™®©°]/g, ' ')           // quitar símbolos trademark/copyright
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// ─── Procesador ──────────────────────────────────────────────────────────────
function extractProcessor(text: string): string | null {
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

// ─── GPU dedicada ────────────────────────────────────────────────────────────
function extractGpu(text: string): string | null {
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

// ─── Función principal ───────────────────────────────────────────────────────
export function extractSpecs(descripcion: string | null): Specs {
  if (!descripcion) {
    return { processor: null, ram_gb: null, storage: null, screen_in: null, gpu: null, has_dedicated_gpu: false }
  }

  const gpu = extractGpu(descripcion)
  return {
    processor:         extractProcessor(descripcion),
    ram_gb:            extractRam(descripcion),
    storage:           extractStorage(descripcion),
    screen_in:         extractScreen(descripcion),
    gpu,
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