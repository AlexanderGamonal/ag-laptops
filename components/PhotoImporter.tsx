'use client'

import { useState, useRef } from 'react'
import { getBrowserSupabase } from '@/lib/supabase'

type PhotoImportResult = {
  success: boolean
  total_filas: number
  fotos_actualizadas: number
  errores: string[]
}

export default function PhotoImporter() {
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<PhotoImportResult | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(file: File) {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data: sessionData } = await getBrowserSupabase().auth.getSession()
      const token = sessionData.session?.access_token
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/import/photos', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al procesar el archivo.')
      } else {
        setResult(data)
      }
    } catch {
      setError('Error de red al subir el archivo.')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Zona de drop */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors
          ${loading ? 'opacity-60 pointer-events-none' : ''}
          ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'}`}
      >
        {loading ? (
          <>
            <svg className="animate-spin w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-slate-600 font-medium">Descargando y subiendo fotos...</p>
            <p className="text-slate-400 text-sm">Esto puede tomar unos minutos según la cantidad de imágenes.</p>
          </>
        ) : (
          <>
            <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-center">
              <p className="text-slate-700 font-semibold">Arrastra tu archivo de fotos aquí</p>
              <p className="text-slate-400 text-sm mt-1">o haz clic para seleccionarlo (.csv, .xlsx, .xls)</p>
            </div>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Resultado */}
      {result && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-semibold text-green-800">Importación de fotos completada</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <Stat label="Filas procesadas" value={result.total_filas}       color="text-slate-700" />
            <Stat label="Fotos subidas"     value={result.fotos_actualizadas} color="text-green-700" />
          </div>
          {result.errores.length > 0 && (
            <div className="mt-2 rounded-xl bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-xs font-semibold text-yellow-800 mb-1">
                Advertencias ({result.errores.length}):
              </p>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {result.errores.map((e, i) => (
                  <p key={i} className="text-xs text-yellow-700 font-mono">{e}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center bg-white rounded-xl p-3 border border-slate-100">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-slate-500 mt-0.5">{label}</span>
    </div>
  )
}
