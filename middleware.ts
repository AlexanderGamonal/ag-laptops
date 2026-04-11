import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_SESSION_COOKIE } from '@/lib/auth-constants'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const hasSession = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)

  if (pathname === '/admin/login' && hasSession) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  if (pathname !== '/admin/login' && !hasSession) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
