import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  source: z.enum(['PDF', 'MANUAL']),
  recordDate: z.string().datetime().optional(),
  projectId: z.string().optional(),
  columns: z
    .array(z.object({ name: z.string().min(1), color: z.string().optional() }))
    .min(1),
  points: z
    .array(
      z.object({
        label: z.string().min(1),
        values: z.record(z.string(), z.number()),
      })
    )
    .min(1),
})

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const source = searchParams.get('source') as 'PDF' | 'MANUAL' | null

  const records = await prisma.dataRecord.findMany({
    where: {
      userId: user.userId,
      ...(projectId ? { projectId } : {}),
      ...(source ? { source } : {}),
    },
    include: {
      _count: { select: { columns: true, points: true, charts: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: records })
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

  const { title, description, source, recordDate, projectId, columns, points } = parsed.data

  const record = await prisma.$transaction(async (tx) => {
    const dataRecord = await tx.dataRecord.create({
      data: {
        title,
        description,
        source,
        recordDate: recordDate ? new Date(recordDate) : undefined,
        projectId,
        userId: user.userId,
      },
    })

    const createdColumns = await Promise.all(
      columns.map((col, i) =>
        tx.dataColumn.create({
          data: { ...col, dataRecordId: dataRecord.id, displayOrder: i },
        })
      )
    )

    const columnMap = Object.fromEntries(createdColumns.map((c) => [c.name, c.id]))

    await Promise.all(
      points.map(async (point, i) => {
        const dataPoint = await tx.dataPoint.create({
          data: { label: point.label, dataRecordId: dataRecord.id, displayOrder: i },
        })
        await Promise.all(
          Object.entries(point.values).map(([colName, value]) => {
            const dataColumnId = columnMap[colName]
            if (!dataColumnId) return
            return tx.dataValue.create({
              data: { dataPointId: dataPoint.id, dataColumnId, value },
            })
          })
        )
      })
    )

    return dataRecord
  })

  return NextResponse.json({ data: record }, { status: 201 })
}
