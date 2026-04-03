'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase, type Laptop } from '@/lib/supabase'
import { extractSpecs } from '@/lib/spec-extractor'
import { formatSellingPrice, formatPrice } from '@/lib/pricing'

const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'TechLaptops'

export default function LaptopDetailPage({ params }: { params: { id: string } }) {
  const [laptop,       setLaptop]       = useState<Laptop | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [activePhoto,  setActivePhoto]  = useState(0)
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('laptops')
      .select('*')
      .eq('id', params.id)
      .eq('activo', true)
      .single()
      .then(({ data, error }) => {
        if (error) setError('Laptop no encontrada.')
        else setLaptop(data)
        setLoading(false)
      })
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    )
  }

  if (error || !laptop) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600 text-lg">Producto no encontrado</p>
        <Link href="/" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
          Ver todos los productos
        </Link>
      </div>
    )
  }

  const photos = [laptop.foto_1, laptop.foto_2, laptop.foto_3].filter(Boolean) as string[]
  const specs = extractSpecs(laptop.descripcion)
  const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, '')
  const whatsappMsg = encodeURIComponent(
    `Hola! Me interesa este producto:\n*${laptop.numero_parte}*\n${laptop.descripcion?.substring(0, 100) || ''}\nPrecio: ${formatSellingPrice(laptop.precio)}`
  )
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || ''
  const emailSubject = encodeURIComponent(`Consulta sobre laptop ${laptop.numero_parte}`)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-bold text-slate-900">{storeName}</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Galería de fotos */}
            <div className="p-6 border-b md:border-b-0 md:border-r border-slate-100">
              {/* Foto principal */}
              <div className="relative h-72 sm:h-80 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden mb-3">
                {photos.length > 0 ? (
                  <Image
                    src={photos[activePhoto]}
                    alt={`${laptop.numero_parte} - foto ${activePhoto + 1}`}
                    fill
                    className="object-contain p-3"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-300">
                    <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Sin fotos disponibles</p>
                  </div>
                )}
              </div>

              {/* Miniaturas */}
              {photos.length > 1 && (
                <div className="flex gap-2 justify-center">
                  {photos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePhoto(i)}
                      className={`relative w-16 h-14 rounded-xl overflow-hidden border-2 transition-colors
                        ${activePhoto === i ? 'border-blue-500' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <Image src={url} alt={`Miniatura ${i + 1}`} fill className="object-contain p-1" sizes="64px" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info del producto */}
            <div className="p-6 flex flex-col gap-5">
              {/* Marca + Código */}
              <div className="flex items-center gap-2 flex-wrap">
                {laptop.marca && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    {laptop.marca}
                  </span>
                )}
                <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  {laptop.numero_parte}
                </p>
              </div>

              {/* Precio de venta */}
              <div>
                <p className="text-3xl font-bold text-blue-700">
                  {formatSellingPrice(laptop.precio)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Precio incluye IGV (18%)</p>
              </div>

              {/* Badges: condición + estado */}
              <div className="flex flex-wrap gap-2">
                {laptop.condicion && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700">
                    {laptop.condicion}
                  </span>
                )}
                {laptop.estado && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium
                    ${laptop.estado.toLowerCase().includes('stock') || laptop.estado.toLowerCase().includes('disponible')
                      ? 'bg-green-100 text-green-800'
                      : laptop.estado.toLowerCase().includes('ingreso')
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'}`}
                  >
                    {laptop.estado}
                  </span>
                )}
              </div>

              {/* Part Number del fabricante */}
              {laptop.part_number && (
                <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3">
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <div>
                    <p className="text-xs text-slate-400 leading-none mb-0.5">Part Number</p>
                    <p className="text-sm font-mono font-medium text-slate-700">{laptop.part_number}</p>
                  </div>
                </div>
              )}

              {/* Specs visuales (si se pudieron extraer) */}
              {(specs.processor || specs.ram_gb || specs.storage || specs.screen_in || specs.gpu) && (
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Especificaciones clave
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {specs.processor && (
                      <SpecItem icon="⚡" label="Procesador" value={specs.processor} />
                    )}
                    {specs.ram_gb && (
                      <SpecItem icon="💾" label="Memoria RAM" value={`${specs.ram_gb} GB`} />
                    )}
                    {specs.storage && (
                      <SpecItem icon="🗄️" label="Almacenamiento" value={specs.storage} />
                    )}
                    {specs.screen_in && (
                      <SpecItem icon="🖥️" label="Pantalla" value={`${specs.screen_in}"`} />
                    )}
                    {specs.gpu && (
                      <SpecItem icon="🎮" label="Tarjeta gráfica" value={specs.gpu} />
                    )}
                    {!specs.has_dedicated_gpu && specs.processor && (
                      <SpecItem icon="🔋" label="Gráficos" value="Integrados" />
                    )}
                  </div>
                </div>
              )}

              {/* Descripción completa */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Descripción completa
                </p>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                  {laptop.descripcion || 'Sin descripción disponible'}
                </p>
              </div>

              {/* Señales de confianza */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                {[
                  { icon: '✅', text: 'Producto verificado' },
                  { icon: '💬', text: 'Respuesta rápida' },
                  { icon: '🚚', text: 'Envíos a todo el país' },
                  { icon: '🔒', text: 'Compra segura' },
                ].map(t => (
                  <div key={t.text} className="flex items-center gap-1.5">
                    <span>{t.icon}</span>
                    <span>{t.text}</span>
                  </div>
                ))}
              </div>

              {/* CTAs de contacto */}
              <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                {whatsappNumber && (
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${whatsappMsg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-colors text-base shadow-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Pedir por WhatsApp
                  </a>
                )}
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}?subject=${emailSubject}&body=${encodeURIComponent(`Hola, me interesa el producto ${laptop.numero_parte}. Precio: ${formatPrice(laptop.precio)}`)}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-2xl transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Enviar correo
                  </a>
                )}
                <p className="text-center text-xs text-slate-400">
                  Te respondemos en menos de 24 horas
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Volver */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700 hover:underline">
            ← Ver todos los productos
          </Link>
        </div>
      </main>
    </div>
  )
}

function SpecItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 bg-white rounded-xl p-3 border border-slate-100">
      <span className="text-base leading-none mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 leading-none mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-700 truncate">{value}</p>
      </div>
    </div>
  )
}
