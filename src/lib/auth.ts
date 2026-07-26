import { SignJWT, jwtVerify } from 'jose'
import { connection } from 'next/server'
import { prisma } from '@/lib/prisma'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-production-min-32-chars'
)

export interface TokenPayload {
  userId: string
  email: string
}

export const TOKEN_COOKIE = 'auth_token'
const TOKEN_EXPIRY = '7d'

// Login desabilitado: toda requisição é tratada como este usuário fixo,
// criado automaticamente no banco na primeira chamada.
const DEV_USER_EMAIL = 'dev@local'
const DEV_USER_NAME = 'Usuário Dev'
let devUserId: string | null = null

async function getDevUser(): Promise<TokenPayload> {
  if (!devUserId) {
    const user = await prisma.user.upsert({
      where: { email: DEV_USER_EMAIL },
      update: {},
      create: { email: DEV_USER_EMAIL, name: DEV_USER_NAME, passwordHash: '' },
    })
    devUserId = user.id
  }
  return { userId: devUserId, email: DEV_USER_EMAIL }
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return { userId: payload.userId as string, email: payload.email as string }
  } catch {
    return null
  }
}

export async function getAuthUser(): Promise<TokenPayload | null> {
  // getDevUser() no longer reads cookies(), so without this, pages that call
  // getAuthUser() lose their only dynamic-rendering signal and Next.js tries to
  // prerender them at build time — running a DB write with no DATABASE_URL available.
  await connection()
  return getDevUser()
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
}
