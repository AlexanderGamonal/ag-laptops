'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getBrowserSupabase, type Laptop } from '@/lib/supabase'
import { formatPrice, formatSellingPrice, TC_USD_TO_PEN } from '@/lib/pricing'

export default function AdminDashboard() {
  const [laptops,  setLaptops]  = useState<Laptop[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<'all' | 'active' | 'hidden'>('all')
  const [toggling,     setToggling]     = useState<string | null>(null)
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const [confirmId,    setConfirmId]    = useState<string | null>(null)
  const [deleteError,  setDeleteError]  = useState<string | null>(null)

  type CleanupStep = 'idle' | 'loading' | 'preview' | 'executing' | 'done'
  type CleanupPreview = { byBrand: Record<string, number>; total: number; toFix: number }
  type CleanupResult  = { deleted: number; fixed: number; deletedBrands: string[] }
  const [cleanupStep,    setCleanupStep]    = useState<CleanupStep>('idle')
  const [cleanupPreview, setCleanupPreview] = useState<CleanupPreview | null>(null)
  const [cleanupResult,  setCleanupResult]  = useState<CleanupResult | null>(null)
  const [cleanupError,   setCleanupError]   = useState<string | null>(null)

  async function getAuthHeader(): Promise<Record<string, string>> {
    const supabase = getBrowserSupabase()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchLaptops = useCallback(async () => {
    setLoading(true)
    const supabase = getBrowserSupabase()
    const { data } = await supabase
      .from('laptops')
      .select('*')
      .order('updated_at', { ascending: false })
    setLaptops(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLaptops() }, [fetchLaptops])

  async function handleCleanupPreview() {
    setCleanupStep('loading')
    setCleanupError(null)
    setCleanupPreview(null)
    setCleanupResult(null)
    try {
      const authHeader = await getAuthHeader()
      const res = await fetch('/api/admin/cleanup-brands', { headers: authHeader })
      const data = await res.json()
      if (!res.ok) { setCleanupError(data.error || 'Error al obtener vista previa.'); setCleanupStep('idle'); return }
      setCleanupPreview(data)
      setCleanupStep('preview')
    } catch {
      setCleanupError('Error de red.')
      setCleanupStep('idle')
    }
  }

  async function handleCleanupExecute() {
    setCleanupStep('executing')
    setCleanupError(null)
    try {
      const authHeader = await getAuthHeader()
      const res = await fetch('/api/admin/cleanup-brands', { method: 'POST', headers: authHeader })
      const data = await res.json()
      if (!res.ok) { setCleanupError(data.error || 'Error al limpiar.'); setCleanupStep('preview'); return }
      setCleanupResult(data)
      setCleanupStep('done')
      fetchLaptops()
    } catch {
      setCleanupError('Error de red.')
      setCleanupStep('preview')
    }
  }

  async function deleteLaptop(id: string) {
    setDeleting(id)
    setDeleteError(null)
    try {
      const authHeader = await getAuthHeader()
      const res = await fetch(`/api/laptops/${id}`, {
        method: 'DELETE',
        headers: authHeader,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error || `Error ${res.status} al eliminar.`)
        return
      }
      setLaptops(prev => prev.filter(l => l.id !== id))
      setConfirmId(null)
    } catch {
      setDeleteError('Error de red al eliminar.')
    } finally {
      setDeleting(null)
    }
  }

  async function toggleActive(laptop: Laptop) {
    setToggling(laptop.id)
    const authHeader = await getAuthHeader()
    await fetch(`/api/laptops/${laptop.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader },
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

  const confirmLaptop = laptops.find(l => l.id === confirmId)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Modal limpieza de marcas */}
      {cleanupStep !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            {(cleanupStep === 'loading' || cleanupStep === 'executing') && (
              <div className="flex flex-col items-center gap-3 py-4">
                <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-slate-600 text-sm">{cleanupStep === 'loading' ? 'Analizando catálogo…' : 'Limpiando marcas…'}</p>
              </div>
            )}

            {cleanupStep === 'preview' && cleanupPreview && (
              <>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Limpiar marcas</h2>
                <p className="text-slate-500 text-sm mb-4">
                  Se conservarán solo: Lenovo, HP, Asus, Acer, Dell, MSI, Apple.
                </p>
                {cleanupPreview.total === 0 && cleanupPreview.toFix === 0 ? (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-4">
                    El catálogo ya está limpio. No hay productos de otras marcas.
                  </p>
                ) : (
                  <div className="mb-4 space-y-2">
                    {cleanupPreview.total > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                        <p className="text-xs font-semibold text-red-700 mb-1">Se eliminarán {cleanupPreview.total} productos:</p>
                        {Object.entries(cleanupPreview.byBrand).map(([brand, count]) => (
                          <p key={brand} className="text-xs text-red-600">{brand}: {count} equipo{count !== 1 ? 's' : ''}</p>
                        ))}
                      </div>
                    )}
                    {cleanupPreview.toFix > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        <p className="text-xs text-amber-700">{cleanupPreview.toFix} nombres con error ortográfico serán corregidos.</p>
                      </div>
                    )}
                  </div>
                )}
                {cleanupError && <p className="text-xs text-red-600 mb-3">{cleanupError}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setCleanupStep('idle')} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors">
                    Cancelar
                  </button>
                  {(cleanupPreview.total > 0 || cleanupPreview.toFix > 0) && (
                    <button onClick={handleCleanupExecute} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors">
                      Confirmar
                    </button>
                  )}
                  {cleanupPreview.total === 0 && cleanupPreview.toFix === 0 && (
                    <button onClick={() => setCleanupStep('idle')} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
                      Cerrar
                    </button>
                  )}
                </div>
              </>
            )}

            {cleanupStep === 'done' && cleanupResult && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Limpieza completada</h2>
                </div>
                <div className="space-y-1.5 mb-4">
                  {cleanupResult.deleted > 0 && (
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold text-red-600">{cleanupResult.deleted}</span> productos eliminados
                      {cleanupResult.deletedBrands.length > 0 && ` (${cleanupResult.deletedBrands.join(', ')})`}
                    </p>
                  )}
                  {cleanupResult.fixed > 0 && (
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold text-amber-600">{cleanupResult.fixed}</span> nombres corregidos
                    </p>
                  )}
                  {cleanupResult.deleted === 0 && cleanupResult.fixed === 0 && (
                    <p className="text-sm text-slate-500">No se realizaron cambios.</p>
                  )}
                </div>
                <button onClick={() => setCleanupStep('idle')} className="w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {confirmId && confirmLaptop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Eliminar laptop</h2>
            <p className="text-slate-600 text-sm mb-1">
              ¿Estás seguro de que quieres eliminar este equipo? Esta acción no se puede deshacer.
            </p>
            <p className="font-mono text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 mb-4 truncate">
              {confirmLaptop.numero_parte} — {confirmLaptop.descripcion || 'Sin descripción'}
            </p>
            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                disabled={deleting === confirmId}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteLaptop(confirmId)}
                disabled={deleting === confirmId}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting === confirmId ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestiona tu inventario de laptops</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCleanupPreview}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Limpiar marcas
          </button>
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
                        <span className="font-semibold text-blue-700">{formatSellingPrice(laptop.precio, laptop)}</span>
                        <span className="block text-xs text-slate-400">{formatPrice((laptop.precio ?? 0) * TC_USD_TO_PEN)} proveedor</span>
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
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/laptops/${laptop.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Fotos
                          </Link>
                          <button
                            onClick={() => { setConfirmId(laptop.id); setDeleteError(null) }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Eliminar
                          </button>
                        </div>
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
