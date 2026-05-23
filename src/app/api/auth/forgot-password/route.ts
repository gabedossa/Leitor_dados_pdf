import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'

const schema = z.object({ email: z.string().email() })

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
  }

  const { email } = parsed.data
  const user = await prisma.user.findUnique({ where: { email, deletedAt: null } })

  // Sempre retorna 200 para evitar enumeração de usuários
  if (user) {
    const token = randomBytes(32).toString('hex')
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hora
      },
    })
    await sendPasswordResetEmail(email, token)
  }

  return NextResponse.json({
    message: 'Se o e-mail existir, você receberá um link em breve',
  })
}
