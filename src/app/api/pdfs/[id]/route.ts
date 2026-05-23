import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const pdf = await prisma.pdfDocument.findFirst({
    where: { id, userId: user.userId },
    include: { dataRecords: true },
  })

  if (!pdf) return NextResponse.json({ error: 'PDF não encontrado' }, { status: 404 })
  return NextResponse.json({ data: pdf })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const pdf = await prisma.pdfDocument.findFirst({ where: { id, userId: user.userId } })
  if (!pdf) return NextResponse.json({ error: 'PDF não encontrado' }, { status: 404 })

  try {
    await unlink(path.join(process.cwd(), pdf.storagePath))
  } catch {
    // arquivo pode já ter sido removido
  }

  await prisma.pdfDocument.delete({ where: { id } })
  return NextResponse.json({ message: 'PDF excluído' })
}
