import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  companyId: z.string().nullable().optional(),
})

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const project = await prisma.project.findFirst({
    where: { id, userId: user.userId },
    include: {
      company: true,
      dataRecords: {
        include: { _count: { select: { columns: true, points: true } } },
        orderBy: { createdAt: 'desc' },
      },
      charts: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!project) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  return NextResponse.json({ data: project })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const result = await prisma.project.updateMany({
    where: { id, userId: user.userId },
    data: parsed.data,
  })

  if (result.count === 0) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  return NextResponse.json({ message: 'Projeto atualizado' })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const result = await prisma.project.deleteMany({ where: { id, userId: user.userId } })
  if (result.count === 0) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  return NextResponse.json({ message: 'Projeto excluído' })
}
