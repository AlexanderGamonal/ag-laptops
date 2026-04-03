'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type Laptop } from '@/lib/supabase'
import { formatSellingPrice, formatPrice } from '@/lib/pricing'
import PhotoUploader from '@/components/PhotoUploader'

export default function EditLaptopPhotos({ params }: { params: { id: string } }) {
  const [laptop,  setLaptop]  = useState<Laptop | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('laptops')
      .select('*')
      .eq('id', params.id)
      .single()
      .then(({ data, error }) => {
        if (error) setError('Laptop no encontrada.')
        else setLaptop(data)
        setLoading(false)
      })
  }, [params.id])

  function handlePhotoUpdate(slot: 1 | 2 | 3, url: string | null) {
    if (!laptop) return
    setLaptop({ ...laptop, [`foto_${slot}`]: url })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    )
  }

  if (error || !laptop) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">{error || 'No encontrado'}</p>
        <Link href="/admin" className="text-blue-600 hover:underline text-sm mt-2 block">
          ← Volver al dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin"
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Editar fotos</h1>
          <p className="font-mono text-slate-400 text-sm">{laptop.numero_parte}</p>
        </div>
      </div>

      {/* Info de la laptop */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <p className="text-sm font-semibold text-slate-700 mb-1">Descripción</p>
        <p className="text-slate-600 text-sm leading-relaxed">{laptop.descripcion || 'Sin descripción'}</p>
        <div className="flex flex-wrap gap-3 mt-3 text-sm items-center">
          {laptop.precio && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Proveedor:</span>
              <span className="font-semibold text-slate-600">{formatPrice(laptop.precio)}</span>
              <span className="text-slate-300">→</span>
              <span className="text-xs text-slate-400">Venta:</span>
              <span className="font-bold text-blue-700">{formatSellingPrice(laptop.precio)}</span>
            </div>
          )}
          {laptop.condicion && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">{laptop.condicion}</span>}
          {laptop.estado    && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">{laptop.estado}</span>}
        </div>
      </div>

      {/* Búsqueda de imágenes en web */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 mb-1">Buscar foto del producto en internet</p>
            <p className="text-xs text-amber-700 mb-3">Abre una búsqueda de imágenes, copia la URL de la foto que quieras y pégala directamente en el slot de foto de abajo.</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent((laptop.marca || '') + ' ' + (laptop.part_number || laptop.numero_parte))}&tbm=isch`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-800 text-xs font-medium hover:bg-amber-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                </svg>
                Google Imágenes (Part Number)
              </a>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent((laptop.descripcion || '').substring(0, 60))}&tbm=isch`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-800 text-xs font-medium hover:bg-amber-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Google Imágenes (Descripción)
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Fotos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="font-semibold text-slate-700 mb-5">
          Fotos del producto
          <span className="ml-2 text-slate-400 font-normal text-sm">
            ({[laptop.foto_1, laptop.foto_2, laptop.foto_3].filter(Boolean).length}/3)
          </span>
        </p>

        <div className="flex flex-wrap justify-center gap-8">
          {([1, 2, 3] as const).map(slot => (
            <PhotoUploader
              key={slot}
              laptopId={laptop.id}
              slot={slot}
              currentUrl={laptop[`foto_${slot}`]}
              onUpdate={handlePhotoUpdate}
            />
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          Formatos aceptados: JPG, PNG, WebP · Máximo 5 MB por imagen
        </p>
      </div>

      {/* Link a la tienda */}
      <div className="mt-4 text-center">
        <Link
          href={`/laptop/${laptop.id}`}
          target="_blank"
          className="text-sm text-blue-600 hover:underline"
        >
          Ver en la tienda →
        </Link>
      </div>
    </div>
  )
}
