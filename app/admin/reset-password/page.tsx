'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserSupabase } from '@/lib/supabase'

type Mode = 'loading' | 'request' | 'sent' | 'reset' | 'success' | 'invalid'

const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'TechLaptops'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [mode, setMode]       = useState<Mode>('loading')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = getBrowserSupabase()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset')
      }
    })

    const hash = window.location.hash
    if (hash.includes('type=recovery') || (hash.includes('access_token') && hash.includes('recovery'))) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setMode(session ? 'reset' : 'invalid')
      })
    } else if (!hash.includes('access_token')) {
      setMode('request')
    }

    return () => subscription.unsubscribe()
  }, [])

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = getBrowserSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    })

    setLoading(false)
    if (error) {
      setError('No se pudo enviar el correo. Verifica el email e intenta de nuevo.')
    } else {
      setMode('sent')
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = getBrowserSupabase()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('No se pudo cambiar la contraseña. El link puede haber expirado.')
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    setMode('success')
    setLoading(false)
    setTimeout(() => router.replace('/admin/login'), 3000)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">{storeName}</h1>
          <p className="text-slate-400 text-sm mt-1">Panel de administración</p>
        </div>

        {mode === 'loading' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 flex justify-center">
            <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}

        {mode === 'request' && (
          <form onSubmit={handleSendEmail} className="bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Restablecer contraseña</h2>
              <p className="text-sm text-slate-500 mt-1">Te enviaremos un link a tu correo.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@tutienda.com"
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? 'Enviando...' : 'Enviar link'}
            </button>
            <Link href="/admin/login" className="text-center text-sm text-slate-500 hover:text-blue-600 transition-colors">
              Volver al inicio de sesión
            </Link>
          </form>
        )}

        {mode === 'sent' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-4 items-center text-center">
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Revisa tu correo</p>
              <p className="text-sm text-slate-500 mt-1">
                Enviamos un link de restablecimiento a <span className="font-medium text-slate-700">{email}</span>
              </p>
            </div>
            <Link href="/admin/login" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
              Volver al inicio de sesión
            </Link>
          </div>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Nueva contraseña</h2>
              <p className="text-sm text-slate-500 mt-1">Elige una contraseña segura.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="password">
                Nueva contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="confirm">
                Confirmar contraseña
              </label>
              <input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        )}

        {mode === 'success' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-4 items-center text-center">
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Contraseña actualizada</p>
              <p className="text-sm text-slate-500 mt-1">Redirigiendo al inicio de sesión...</p>
            </div>
          </div>
        )}

        {mode === 'invalid' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-4 items-center text-center">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-800">Link inválido o expirado</p>
              <p className="text-sm text-slate-500 mt-1">Solicita un nuevo link de restablecimiento.</p>
            </div>
            <Link href="/admin/reset-password" className="text-sm text-blue-600 hover:underline">
              Solicitar nuevo link
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
