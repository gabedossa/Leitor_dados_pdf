import { NextResponse } from 'next/server'
import { TOKEN_COOKIE } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ message: 'Logout realizado' })
  response.cookies.delete(TOKEN_COOKIE)
  return response
}
