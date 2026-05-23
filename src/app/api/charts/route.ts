import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['LINE', 'BAR', 'PIE']),
  dataRecordId: z.string(),
  projectId: z.string().optional(),
  config: z
    .object({
      xAxisLabel: z.string().optional(),
      yAxisLabel: z.string().optional(),
      showLegend: z.boolean().optional(),
      showGrid: z.boolean().optional(),
      stacked: z.boolean().optional(),
    })
    .optional(),
})

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const projectId = new URL(request.url).searchParams.get('projectId')

  const charts = await prisma.chart.findMany({
    where: { userId: user.userId, ...(projectId ? { projectId } : {}) },
    include: {
      dataRecord: { select: { id: true, title: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: charts })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const record = await prisma.dataRecord.findFirst({
    where: { id: parsed.data.dataRecordId, userId: user.userId },
  })
  if (!record) {
    return NextResponse.json({ error: 'Dataset não encontrado' }, { status: 404 })
  }

  const chart = await prisma.chart.create({
    data: { ...parsed.data, userId: user.userId },
  })

  return NextResponse.json({ data: chart }, { status: 201 })
}
