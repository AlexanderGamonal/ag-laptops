'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { supabase, type Laptop } from '@/lib/supabase'
import { extractSpecs, normalizeText } from '@/lib/spec-extractor'
import { formatSellingPrice, calcSellingPrice } from '@/lib/pricing'
import LaptopCard from '@/components/LaptopCard'

const storeName   = process.env.NEXT_PUBLIC_STORE_NAME || 'TechLaptops'
const waNumber    = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, '')
const storeEmail  = process.env.NEXT_PUBLIC_CONTACT_EMAIL || ''

function matchesSearch(laptop: Laptop, query: string): boolean {
  const q = normalizeText(query)
  return (
    normalizeText(laptop.numero_parte).includes(q) ||
    normalizeText(laptop.descripcion  || '').includes(q) ||
    normalizeText(laptop.marca        || '').includes(q) ||
    normalizeText(laptop.part_number  || '').includes(q)
  )
}

type Filters = {
  search:    string
  marca:     string
  processor: string
  ram:       string
  storage:   string
  screen:    string
  gpu:       string   // '' | 'dedicated'
  condicion: string
  precioMax: string   // precio de VENTA máx
}
const EMPTY: Filters = {
  search:'', marca:'', processor:'', ram:'', storage:'', screen:'', gpu:'', condicion:'', precioMax:'',
}

const FAQ = [
  { q: '¿Los precios incluyen IGV?', a: 'Sí. Todos los precios mostrados incluyen el IGV del 18%.' },
  { q: '¿Hacen envíos?',             a: 'Sí, enviamos a todo el país. El costo y tiempo de envío se coordina por WhatsApp según tu ubicación.' },
  { q: '¿Tienen garantía?',          a: 'Los equipos nuevos cuentan con garantía del fabricante. Los reacondicionados tienen garantía técnica. Consúltanos por WhatsApp para detalles.' },
  { q: '¿Aceptan tarjeta de crédito?', a: 'Aceptamos transferencia bancaria, Yape/Plin y tarjeta de crédito/débito. Contáctanos para coordinar el pago.' },
  { q: '¿Puedo ver el equipo antes de comprarlo?', a: 'Sí, puedes coordinar una visita o videollamada para revisar el equipo. Escríbenos por WhatsApp.' },
]

export default function StorePage() {
  const [laptops,  setLaptops]  = useState<Laptop[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filters,  setFilters]  = useState<Filters>(EMPTY)
  const [openFaq,  setOpenFaq]  = useState<number | null>(null)

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('laptops').select('*').eq('activo', true).order('updated_at', { ascending: false })
    setLaptops(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const enriched = useMemo(() =>
    laptops.map(l => ({ laptop: l, specs: extractSpecs(l.descripcion), sellingPrice: calcSellingPrice(l.precio ?? 0) })),
    [laptops]
  )

  const options = useMemo(() => ({
    marcas:     Array.from(new Set(enriched.map(e => e.laptop.marca).filter(Boolean))).sort() as string[],
    processors: Array.from(new Set(enriched.map(e => e.specs.processor).filter(Boolean))).sort() as string[],
    rams:       (Array.from(new Set(enriched.map(e => e.specs.ram_gb).filter(Boolean))) as number[]).sort((a,b)=>a-b),
    storages:   Array.from(new Set(enriched.map(e => e.specs.storage).filter(Boolean))).sort() as string[],
    screens:    (Array.from(new Set(enriched.map(e => e.specs.screen_in).filter(Boolean))) as number[]).sort((a,b)=>a-b),
    condiciones:Array.from(new Set(enriched.map(e => e.laptop.condicion).filter(Boolean))).sort() as string[],
  }), [enriched])

  const filtered = useMemo(() => enriched.filter(({ laptop, specs, sellingPrice }) => {
    const f = filters
    if (f.search    && !matchesSearch(laptop, f.search))                                      return false
    if (f.marca     && (laptop.marca||'').toLowerCase() !== f.marca.toLowerCase())            return false
    if (f.condicion && (laptop.condicion||'').toLowerCase() !== f.condicion.toLowerCase())    return false
    if (f.processor && specs.processor !== f.processor)                                       return false
    if (f.ram       && specs.ram_gb    !== parseInt(f.ram))                                   return false
    if (f.storage   && specs.storage   !== f.storage)                                         return false
    if (f.screen    && specs.screen_in !== parseFloat(f.screen))                              return false
    if (f.gpu === 'dedicated' && !specs.has_dedicated_gpu)                                    return false
    if (f.precioMax && sellingPrice > parseFloat(f.precioMax))                                return false
    return true
  }), [enriched, filters])

  const set = (k: keyof Filters) => (v: string) => setFilters(p => ({ ...p, [k]: v }))
  const hasFilters    = Object.values(filters).some(v => v !== '')
  const activeCount   = Object.values(filters).filter(v => v !== '').length

  const WA_ICON = (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="leading-none">
              <p className="font-bold text-base text-slate-900">{storeName}</p>
              <p className="text-xs text-slate-400 mt-0.5">Laptops y tecnología — precio justo</p>
            </div>
          </Link>

          {/* Búsqueda */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Buscar modelo, procesador, marca..."
                value={filters.search} onChange={e => set('search')(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
            </div>
          </div>

          {waNumber && (
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors flex-shrink-0">
              {WA_ICON}
              WhatsApp
            </a>
          )}
        </div>
      </header>

      {/* ── Layout principal ────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-5 pt-4">

        {/* ── Sidebar filtros (full height, sin scroll) ─────────────────── */}
        <aside className="hidden lg:flex flex-col flex-shrink-0 w-52"
          style={{ position: 'sticky', top: '64px', height: 'calc(100vh - 72px)' }}>
          <div className="bg-white rounded-2xl border border-slate-200 flex flex-col h-full overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 flex-shrink-0">
              <span className="font-semibold text-slate-800 text-sm">Filtros</span>
              {hasFilters && (
                <button onClick={() => setFilters(EMPTY)}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  Limpiar {activeCount > 0 && <span className="bg-blue-100 text-blue-700 rounded-full px-1.5">{activeCount}</span>}
                </button>
              )}
            </div>

            {/* Filtros — distribuidos equitativamente */}
            <div className="flex-1 flex flex-col justify-between px-3 py-2 gap-1 min-h-0">

              {/* Búsqueda móvil */}
              <div className="sm:hidden">
                <input type="text" placeholder="Buscar..." value={filters.search}
                  onChange={e => set('search')(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Procesador */}
              {options.processors.length > 0 && (
                <FilterBlock label="Procesador">
                  <CompactSelect value={filters.processor} onChange={set('processor')}>
                    <option value="">Todos</option>
                    {options.processors.map(p => <option key={p} value={p}>{p}</option>)}
                  </CompactSelect>
                </FilterBlock>
              )}

              {/* RAM */}
              {options.rams.length > 0 && (
                <FilterBlock label="RAM">
                  <CompactSelect value={filters.ram} onChange={set('ram')}>
                    <option value="">Todos</option>
                    {options.rams.map(v => <option key={v} value={String(v)}>{v}GB</option>)}
                  </CompactSelect>
                </FilterBlock>
              )}

              {/* Almacenamiento */}
              {options.storages.length > 0 && (
                <FilterBlock label="Almacenamiento">
                  <CompactSelect value={filters.storage} onChange={set('storage')}>
                    <option value="">Todos</option>
                    {options.storages.map(s => <option key={s} value={s}>{s}</option>)}
                  </CompactSelect>
                </FilterBlock>
              )}

              {/* Pantalla */}
              {options.screens.length > 0 && (
                <FilterBlock label="Pantalla">
                  <CompactSelect value={filters.screen} onChange={set('screen')}>
                    <option value="">Todos</option>
                    {options.screens.map(v => <option key={v} value={String(v)}>{v}"</option>)}
                  </CompactSelect>
                </FilterBlock>
              )}

              {/* GPU dedicada — toggle */}
              <FilterBlock label="Tarjeta gráfica">
                <button
                  onClick={() => set('gpu')(filters.gpu === 'dedicated' ? '' : 'dedicated')}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors
                    ${filters.gpu === 'dedicated' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                  </svg>
                  Solo con GPU dedicada
                </button>
              </FilterBlock>

              {/* Condición */}
              {options.condiciones.length > 0 && (
                <FilterBlock label="Condición">
                  <CompactSelect value={filters.condicion} onChange={set('condicion')}>
                    <option value="">Todos</option>
                    {options.condiciones.map(v => <option key={v} value={v}>{v}</option>)}
                  </CompactSelect>
                </FilterBlock>
              )}

              {/* Precio máximo de venta */}
              <FilterBlock label="Precio máx (USD)">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <input type="number" placeholder="Ej: 1000"
                    value={filters.precioMax} onChange={e => set('precioMax')(e.target.value)}
                    className="w-full pl-6 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </FilterBlock>

            </div>
          </div>
        </aside>

        {/* ── Contenido ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 pb-12">

          {/* Chips de marcas */}
          {!loading && options.marcas.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Chip active={!filters.marca} onClick={() => set('marca')('')}>Todos</Chip>
              {options.marcas.map(m => (
                <Chip key={m} active={filters.marca === m} onClick={() => set('marca')(filters.marca === m ? '' : m)}>{m}</Chip>
              ))}
            </div>
          )}

          {/* Barra de estado + filtros móvil */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">
              {loading ? 'Cargando...' : (
                <>{filtered.length} <strong className="text-slate-700">producto{filtered.length !== 1 ? 's' : ''}</strong>
                  {hasFilters && <span className="text-blue-600"> filtrados</span>}
                </>
              )}
            </p>
            {/* Botón filtros móvil */}
            <button className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-sm text-slate-600 bg-white"
              onClick={() => alert('Filtros disponibles en pantallas grandes')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M11 12h2" />
              </svg>
              Filtros{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
          </div>

          {/* Chips de filtros activos */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(filters).map(([k, v]) => {
                if (!v) return null
                const label: Record<string, string> = {
                  search:`"${v}"`, marca:v, processor:v, ram:`${v}GB RAM`, storage:v,
                  screen:`${v}"`, gpu:'GPU dedicada', condicion:v, precioMax:`≤ $${v}`,
                }
                return (
                  <button key={k} onClick={() => set(k as keyof Filters)('')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100 hover:bg-blue-100">
                    {label[k]}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )
              })}
            </div>
          )}

          {/* Grid de productos */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 h-80 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">Sin resultados</p>
              <button onClick={() => setFilters(EMPTY)}
                className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                Ver todos los productos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(({ laptop, specs }) => (
                <LaptopCard key={laptop.id} laptop={laptop} specs={specs} />
              ))}
            </div>
          )}

          {/* ── FAQ ──────────────────────────────────────────────────────── */}
          <section className="mt-16 mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Preguntas frecuentes</h2>
            <div className="flex flex-col gap-2">
              {FAQ.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <span className="font-medium text-slate-800 text-sm">{item.q}</span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${openFaq === i ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-sm text-slate-600">{item.a}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <div>
            <p className="font-semibold text-slate-700">{storeName}</p>
            <p className="text-xs mt-0.5">Laptops nuevas y reacondicionadas · Precios con IGV incluido</p>
          </div>
          <div className="flex items-center gap-4">
            {storeEmail  && <a href={`mailto:${storeEmail}`} className="hover:text-slate-700">{storeEmail}</a>}
            {waNumber    && <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-600">WhatsApp</a>}
            <Link href="/admin" className="hover:text-slate-700">Admin</Link>
          </div>
        </div>
      </footer>

      {/* ── Botón WhatsApp flotante ──────────────────────────────────────── */}
      {waNumber && (
        <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Hola, vi su tienda y me interesa consultar sobre un producto.')}`}
          target="_blank" rel="noopener noreferrer"
          title="Contactar por WhatsApp"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}
    </div>
  )
}

// ── Componentes pequeños ─────────────────────────────────────────────────────
function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3.5 py-1 rounded-full text-sm font-medium transition-all border
        ${active ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
      {children}
    </button>
  )
}

function FilterBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      {children}
    </div>
  )
}

function CompactSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
      {children}
    </select>
  )
}
