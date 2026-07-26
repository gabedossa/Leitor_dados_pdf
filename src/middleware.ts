import { NextResponse } from 'next/server'

// Login desabilitado: middleware não redireciona nem bloqueia nada.
// getAuthUser() (src/lib/auth.ts) sempre resolve para um usuário dev fixo.
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
