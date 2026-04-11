/**
 * Rate limiter en memoria.
 * Funciona por IP. Adecuado para un solo servidor / Vercel (una instancia).
 * Para multi-instancia se necesitaría Redis u otro store compartido.
 */

type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

// Limpia entradas expiradas cada 5 minutos para evitar memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    store.forEach((entry, key) => {
      if (now >= entry.resetAt) store.delete(key)
    })
  }, 5 * 60 * 1000)
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

/**
 * @param key      Identificador único (ej. `login:${ip}`)
 * @param limit    Máximo de solicitudes permitidas en la ventana
 * @param windowMs Duración de la ventana en milisegundos
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.count++
  return { allowed: true }
}

/** Extrae la IP del request de Next.js (compatible con Vercel y proxies). */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
