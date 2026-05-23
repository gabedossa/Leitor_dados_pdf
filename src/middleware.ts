import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { TOKEN_COOKIE } from '@/lib/auth'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-production-min-32-chars'
)

const AUTH_ROUTES = ['/login', '/register', '/forgot-password']
const PUBLIC_API = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(TOKEN_COOKIE)?.value
  const isAuthenticated = token ? await isValidToken(token) : false

  if (AUTH_ROUTES.some((r) => pathname.startsWith(r)) && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname.startsWith('/dashboard') && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/api/') && !PUBLIC_API.includes(pathname) && !isAuthenticated) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  return NextResponse.next()
}

async function isValidToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret)
    return true
  } catch {
    return false
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
