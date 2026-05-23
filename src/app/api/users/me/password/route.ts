import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function PATCH(request: NextRequest) {
  const authUser = await getAuthUser()
  if (!authUser) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: { id: authUser.userId, deletedAt: null },
  })

  if (!user) return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })

  const passwordMatches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!passwordMatches) {
    return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  })

  return NextResponse.json({ message: 'Senha atualizada' })
}
