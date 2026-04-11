'use client'

import Image from 'next/image'
import { useState, useRef } from 'react'
import { getBrowserSupabase } from '@/lib/supabase'

type Slot = 1 | 2 | 3

interface PhotoUploaderProps {
  laptopId: string
  slot: Slot
  currentUrl: string | null
  onUpdate: (slot: Slot, url: string | null) => void
}

export default function PhotoUploader({ laptopId, slot, currentUrl, onUpdate }: PhotoUploaderProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function getAdminHeaders() {
    const supabase = getBrowserSupabase()
    const { data, error } = await supabase.auth.getSession()
    const accessToken = data.session?.access_token

    if (error || !accessToken) {
      throw new Error('SESSION_EXPIRED')
    }

    return {
      Authorization: `Bearer ${accessToken}`,
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('slot', String(slot))
      const headers = await getAdminHeaders()

      const res = await fetch(`/api/laptops/${laptopId}/photos`, {
        method: 'POST',
        body: formData,
        headers,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al subir la foto.')
      } else {
        onUpdate(slot, data.url)
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        setError('Tu sesión de administrador expiró. Vuelve a iniciar sesión.')
      } else {
        setError('Error de red al subir la foto.')
      }
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar la foto ${slot}?`)) return

    setLoading(true)
    setError(null)

    try {
      const headers = await getAdminHeaders()
      const res = await fetch(`/api/laptops/${laptopId}/photos?slot=${slot}`, {
        method: 'DELETE',
        headers,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al eliminar la foto.')
      } else {
        onUpdate(slot, null)
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        setError('Tu sesión de administrador expiró. Vuelve a iniciar sesión.')
      } else {
        setError('Error de red al eliminar la foto.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Foto {slot}
      </p>

      <div
        className={`relative w-40 h-36 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-colors
          ${loading ? 'opacity-50 pointer-events-none' : ''}
          ${currentUrl ? 'border-slate-300 bg-slate-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'}`}
        onClick={() => !currentUrl && !loading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') !currentUrl && inputRef.current?.click() }}
      >
        {currentUrl ? (
          <Image
            src={currentUrl}
            alt={`Foto ${slot}`}
            fill
            className="object-contain p-1"
            sizes="160px"
          />
        ) : loading ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <svg className="animate-spin w-8 h-8" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-xs">Subiendo...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs text-center px-2">Clic para agregar foto</span>
          </div>
        )}
      </div>

      {/* Botones de acción cuando hay foto */}
      {currentUrl && !loading && (
        <div className="flex gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            className="text-xs px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
          >
            Cambiar
          </button>
          <button
            onClick={handleDelete}
            className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium"
          >
            Eliminar
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 text-center max-w-[160px]">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
