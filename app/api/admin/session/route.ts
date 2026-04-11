import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE } from '@/lib/auth-constants'
import { getAdminUserFromToken } from '@/lib/admin-auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const COOKIE_MAX_AGE = 60 * 60 * 8

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${rl.retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const body = await request.json()
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken : ''
    const user = await getAdminUserFromToken(accessToken)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    cookies().set(ADMIN_SESSION_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    })

    return NextResponse.json({ success: true, email: user.email })
  } catch (error) {
    console.error('[POST /api/admin/session]', error)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}

export async function DELETE() {
  cookies().delete(ADMIN_SESSION_COOKIE)
  return NextResponse.json({ success: true })
}
