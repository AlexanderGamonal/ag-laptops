import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

// ── Upstash (producción) ──────────────────────────────────────────────────────
// Requiere UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en las env vars.
// En desarrollo sin esas variables se usa el fallback en memoria.

let upstashClient: Redis | null = null

function getUpstashClient(): Redis | null {
  if (upstashClient) return upstashClient
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  upstashClient = new Redis({ url, token })
  return upstashClient
}

// ── Fallback en memoria (desarrollo / single-instance) ───────────────────────
type Entry = { count: number; resetAt: number }
const memStore = new Map<string, Entry>()

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    memStore.forEach((entry, key) => {
      if (now >= entry.resetAt) memStore.delete(key)
    })
  }, 5 * 60 * 1000)
}

function memRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now   = Date.now()
  const entry = memStore.get(key)

  if (!entry || now >= entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }
  if (entry.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) }
  }
  entry.count++
  return { allowed: true }
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * @param key      Identificador único (ej. `login:${ip}`)
 * @param limit    Máximo de solicitudes permitidas en la ventana
 * @param windowMs Duración de la ventana en milisegundos
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redis = getUpstashClient()

  if (!redis) {
    return memRateLimit(key, limit, windowMs)
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${Math.ceil(windowMs / 1000)} s`),
  })

  const { success, reset } = await limiter.limit(key)

  if (success) return { allowed: true }

  return {
    allowed: false,
    retryAfterSeconds: Math.ceil((reset - Date.now()) / 1000),
  }
}

/**
 * Extrae la IP real del request.
 * En Vercel, x-forwarded-for es inyectado por la infraestructura y no puede ser
 * falsificado por el cliente. En otros entornos, asegúrate de que solo tu proxy
 * de confianza pueda escribir este header.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
