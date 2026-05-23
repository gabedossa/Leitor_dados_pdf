import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  type: z.enum(['LINE', 'BAR', 'PIE']).optional(),
  config: z.record(z.unknown()).optional(),
})

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const chart = await prisma.chart.findFirst({
    where: { id, userId: user.userId },
    include: {
      dataRecord: {
        include: {
          columns: { orderBy: { displayOrder: 'asc' } },
          points: {
            orderBy: { displayOrder: 'asc' },
            include: { values: true },
          },
        },
      },
    },
  })

  if (!chart) return NextResponse.json({ error: 'Gráfico não encontrado' }, { status: 404 })
  return NextResponse.json({ data: chart })
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

  const { config, ...rest } = parsed.data
  const result = await prisma.chart.updateMany({
    where: { id, userId: user.userId },
    data: {
      ...rest,
      ...(config !== undefined ? { config: JSON.parse(JSON.stringify(config)) } : {}),
    },
  })

  if (result.count === 0) return NextResponse.json({ error: 'Gráfico não encontrado' }, { status: 404 })
  return NextResponse.json({ message: 'Gráfico atualizado' })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const result = await prisma.chart.deleteMany({ where: { id, userId: user.userId } })
  if (result.count === 0) return NextResponse.json({ error: 'Gráfico não encontrado' }, { status: 404 })
  return NextResponse.json({ message: 'Gráfico excluído' })
}
