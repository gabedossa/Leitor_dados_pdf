import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().optional(),
  companyId: z.string().optional(),
})

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const projects = await prisma.project.findMany({
    where: { userId: user.userId },
    include: {
      company: true,
      _count: { select: { dataRecords: true, charts: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ data: projects })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const project = await prisma.project.create({
    data: { ...parsed.data, userId: user.userId },
  })

  return NextResponse.json({ data: project }, { status: 201 })
}
