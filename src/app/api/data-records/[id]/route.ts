import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  recordDate: z.string().datetime().optional(),
  projectId: z.string().nullable().optional(),
  columns: z
    .array(z.object({ name: z.string().min(1), color: z.string().optional() }))
    .min(1)
    .optional(),
  points: z
    .array(
      z.object({
        label: z.string().min(1),
        values: z.record(z.string(), z.number()),
      })
    )
    .min(1)
    .optional(),
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
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { columns, points, title, description, recordDate, projectId } = parsed.data

  const existing = await prisma.dataRecord.findFirst({ where: { id, userId: user.userId } })
  if (!existing) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })

  await prisma.$transaction(
    async (tx) => {
      await tx.dataRecord.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(projectId !== undefined ? { projectId } : {}),
          ...(recordDate ? { recordDate: new Date(recordDate) } : {}),
        },
      })

      if (columns && points) {
        // Substitui séries/pontos/valores por completo — mais simples e seguro do
        // que tentar casar (diff) os itens antigos com os novos por nome/posição.
        await tx.dataPoint.deleteMany({ where: { dataRecordId: id } })
        await tx.dataColumn.deleteMany({ where: { dataRecordId: id } })

        const createdColumns = await tx.dataColumn.createManyAndReturn({
          data: columns.map((col, i) => ({ ...col, dataRecordId: id, displayOrder: i })),
        })
        const columnMap = Object.fromEntries(createdColumns.map((c) => [c.name, c.id]))

        const createdPoints = await tx.dataPoint.createManyAndReturn({
          data: points.map((point, i) => ({ label: point.label, dataRecordId: id, displayOrder: i })),
        })

        const dataValues = points.flatMap((point, i) =>
          Object.entries(point.values)
            .filter(([colName]) => columnMap[colName])
            .map(([colName, value]) => ({
              dataPointId: createdPoints[i].id,
              dataColumnId: columnMap[colName],
              value,
            }))
        )

        if (dataValues.length > 0) {
          await tx.dataValue.createMany({ data: dataValues })
        }
      }
    },
    { timeout: 30000 }
  )

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
