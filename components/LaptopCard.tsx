'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Laptop } from '@/lib/supabase'
import type { Specs } from '@/lib/spec-extractor'
import { formatSellingPrice } from '@/lib/pricing'
import { getLaptopHref } from '@/lib/laptop-slug'

// Colores por marca
const BRAND_COLORS: Record<string, string> = {
  lenovo:    'bg-red-50 text-red-700',
  asus:      'bg-blue-50 text-blue-700',
  dell:      'bg-sky-50 text-sky-700',
  acer:      'bg-green-50 text-green-700',
  msi:       'bg-red-50 text-red-600',
  hp:        'bg-cyan-50 text-cyan-700',
  apple:     'bg-slate-100 text-slate-600',
  jbl:       'bg-orange-50 text-orange-700',
  onn:       'bg-purple-50 text-purple-700',
  samsung:   'bg-blue-50 text-blue-600',
  microsoft: 'bg-sky-50 text-sky-600',
}

function getBrandClass(marca: string | null): string {
  if (!marca) return 'bg-slate-100 text-slate-600'
  return BRAND_COLORS[marca.toLowerCase()] ?? 'bg-slate-100 text-slate-600'
}

interface LaptopCardProps {
  laptop: Laptop
  specs?: Specs
}

export default function LaptopCard({ laptop, specs }: LaptopCardProps) {
  const mainPhoto = laptop.foto_1 || laptop.foto_2 || laptop.foto_3

  // Chips de specs compactas para mostrar en la tarjeta
  const specChips: { icon: string; label: string }[] = []
  if (specs?.processor_family) specChips.push({ icon: '⚡', label: specs.processor_family })
  if (specs?.ram_gb)       specChips.push({ icon: '💾', label: `${specs.ram_gb}GB RAM` })
  if (specs?.storage)      specChips.push({ icon: '🗄️', label: specs.storage })
  if (specs?.screen_in)    specChips.push({ icon: '🖥️', label: `${specs.screen_in}"` })
  if (specs?.gpu_family)   specChips.push({ icon: '🎮', label: specs.gpu_family })

  return (
    <Link
      href={getLaptopHref(laptop)}
      className="group flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Imagen */}
      <div className="relative h-52 bg-gradient-to-b from-white via-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
        {mainPhoto ? (
          <Image
            src={mainPhoto}
            alt={laptop.descripcion?.substring(0, 60) || 'Producto'}
            fill
            className="object-contain object-center p-0.5 sm:p-1 group-hover:scale-[1.04] transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-300">
            <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">Sin foto</span>
          </div>
        )}
        {/* Badge condición sobre la imagen */}
        {laptop.condicion && laptop.condicion.toLowerCase() === 'refurbished' && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white">
            Reacondicionado
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex flex-col flex-1 p-4 gap-2.5">
        {/* Marca + Código */}
        <div className="flex items-center justify-between gap-2">
          {laptop.marca ? (
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${getBrandClass(laptop.marca)}`}>
              {laptop.marca}
            </span>
          ) : <span />}
          <p className="text-xs font-mono text-slate-400 truncate ml-auto">
            {laptop.numero_parte}
          </p>
        </div>

        {/* Descripción truncada */}
        <p className="text-sm text-slate-700 line-clamp-2 leading-snug flex-1">
          {laptop.descripcion || 'Sin descripción'}
        </p>

        {/* Chips de specs (solo si hay) */}
        {specChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {specChips.slice(0, 4).map(chip => (
              <span key={chip.label}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-medium"
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* Precio + CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
          <div>
            <span className="text-lg font-bold text-blue-700">
              {formatSellingPrice(laptop.precio, laptop)}
            </span>
            <span className="text-xs text-slate-400 block leading-none mt-0.5">IGV incluido</span>
          </div>
          <span className="text-xs font-medium text-blue-600 group-hover:underline">
            Ver detalle →
          </span>
        </div>
      </div>
    </Link>
  )
}
