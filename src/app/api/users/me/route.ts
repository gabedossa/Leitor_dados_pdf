import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const updateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
})

export async function GET() {
  const authUser = await getAuthUser()
  if (!authUser) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const user = await prisma.user.findFirst({
    where: { id: authUser.userId, deletedAt: null },
    select: { id: true, name: true, email: true, avatarUrl: true },
  })

  if (!user) return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
  return NextResponse.json({ data: user })
}

export async function PATCH(request: NextRequest) {
  const authUser = await getAuthUser()
  if (!authUser) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })
  }

  const existing = await prisma.user.findFirst({
    where: {
      email: parsed.data.email,
      id: { not: authUser.userId },
      deletedAt: null,
    },
  })

  if (existing) {
    return NextResponse.json({ error: 'E-mail ja cadastrado' }, { status: 409 })
  }

  const user = await prisma.user.update({
    where: { id: authUser.userId },
    data: parsed.data,
    select: { id: true, name: true, email: true, avatarUrl: true },
  })

  return NextResponse.json({ data: user, message: 'Perfil atualizado' })
}
