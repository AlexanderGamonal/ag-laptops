'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase, type Laptop } from '@/lib/supabase'
import { formatPrice, formatSellingPrice } from '@/lib/pricing'

export default function AdminDashboard() {
  const [laptops,  setLaptops]  = useState<Laptop[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<'all' | 'active' | 'hidden'>('all')
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchLaptops = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('laptops')
      .select('*')
      .order('updated_at', { ascending: false })
    setLaptops(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLaptops() }, [fetchLaptops])

  async function toggleActive(laptop: Laptop) {
    setToggling(laptop.id)
    await fetch(`/api/laptops/${laptop.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !laptop.activo }),
    })
    setLaptops(prev => prev.map(l => l.id === laptop.id ? { ...l, activo: !l.activo } : l))
    setToggling(null)
  }

  const filtered = laptops.filter(l => {
    const matchSearch = !search ||
      l.numero_parte.toLowerCase().includes(search.toLowerCase()) ||
      (l.descripcion || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all'    ? true :
      filter === 'active' ? l.activo :
      !l.activo
    return matchSearch && matchFilter
  })

  const stats = {
    total:  laptops.length,
    active: laptops.filter(l => l.activo).length,
    hidden: laptops.filter(l => !l.activo).length,
    sinFoto: laptops.filter(l => !l.foto_1 && !l.foto_2 && !l.foto_3).length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestiona tu inventario de laptops</p>
        </div>
        <Link
          href="/admin/import"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Importar Excel
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total laptops', value: stats.total,   color: 'text-slate-900' },
          { label: 'Activas',       value: stats.active,  color: 'text-green-700' },
          { label: 'Ocultas',       value: stats.hidden,  color: 'text-slate-500' },
          { label: 'Sin foto',      value: stats.sinFoto, color: 'text-amber-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-slate-500 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por número de parte o descripción..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          {(['all', 'active', 'hidden'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {{ all: 'Todas', active: 'Activas', hidden: 'Ocultas' }[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-slate-400">
          <p className="text-lg font-medium">No hay laptops{search ? ` que coincidan con "${search}"` : ''}</p>
          {laptops.length === 0 && (
            <p className="text-sm mt-2">
              <Link href="/admin/import" className="text-blue-600 hover:underline">Importa tu primer archivo Excel</Link> para empezar.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-slate-500 font-medium w-16">Foto</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">No. Parte</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium max-w-xs">Descripción</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Precio</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Condición</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Estado</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Visible</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(laptop => {
                  const photo = laptop.foto_1 || laptop.foto_2 || laptop.foto_3
                  return (
                    <tr key={laptop.id} className={`hover:bg-slate-50 transition-colors ${!laptop.activo ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="w-12 h-10 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden relative">
                          {photo ? (
                            <Image src={photo} alt="" fill className="object-contain p-1" sizes="48px" />
                          ) : (
                            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{laptop.numero_parte}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="line-clamp-2 text-slate-700">{laptop.descripcion || '—'}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-blue-700">{formatSellingPrice(laptop.precio)}</span>
                        <span className="block text-xs text-slate-400">{formatPrice(laptop.precio)} proveedor</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{laptop.condicion || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{laptop.estado || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(laptop)}
                          disabled={toggling === laptop.id}
                          className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none
                            ${laptop.activo ? 'bg-green-500' : 'bg-slate-300'}
                            ${toggling === laptop.id ? 'opacity-50' : ''}`}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5
                            ${laptop.activo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/laptops/${laptop.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Fotos
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            Mostrando {filtered.length} de {laptops.length} laptops
          </div>
        </div>
      )}
    </div>
  )
}
