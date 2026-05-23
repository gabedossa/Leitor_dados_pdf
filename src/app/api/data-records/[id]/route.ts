import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  recordDate: z.string().datetime().optional(),
  projectId: z.string().nullable().optional(),
})

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const record = await prisma.dataRecord.findFirst({
    where: { id, userId: user.userId },
    include: {
      columns: { orderBy: { displayOrder: 'asc' } },
      points: {
        orderBy: { displayOrder: 'asc' },
        include: { values: true },
      },
      charts: true,
      pdfDocument: { select: { id: true, originalName: true } },
    },
  })

  if (!record) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })
  return NextResponse.json({ data: record })
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

  const result = await prisma.dataRecord.updateMany({
    where: { id, userId: user.userId },
    data: {
      ...parsed.data,
      ...(parsed.data.recordDate ? { recordDate: new Date(parsed.data.recordDate) } : {}),
    },
  })

  if (result.count === 0) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })
  return NextResponse.json({ message: 'Registro atualizado' })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const result = await prisma.dataRecord.deleteMany({ where: { id, userId: user.userId } })
  if (result.count === 0) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })
  return NextResponse.json({ message: 'Registro excluído' })
}
