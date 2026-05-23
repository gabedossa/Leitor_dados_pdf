import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const projectId = new URL(request.url).searchParams.get('projectId')

  const pdfs = await prisma.pdfDocument.findMany({
    where: { userId: user.userId, ...(projectId ? { projectId } : {}) },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: pdfs })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const projectId = formData.get('projectId') as string | null

  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Arquivo PDF obrigatório' }, { status: 400 })
  }

  const maxBytes = parseInt(process.env.MAX_FILE_SIZE_MB ?? '20') * 1024 * 1024
  if (file.size > maxBytes) {
    return NextResponse.json({ error: 'Arquivo muito grande' }, { status: 400 })
  }

  const uploadDir = process.env.UPLOAD_DIR ?? './uploads'
  const userDir = path.join(process.cwd(), uploadDir, user.userId)
  await mkdir(userDir, { recursive: true })

  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const storagePath = path.join(uploadDir, user.userId, filename)
  await writeFile(path.join(process.cwd(), storagePath), Buffer.from(await file.arrayBuffer()))

  const pdf = await prisma.pdfDocument.create({
    data: {
      originalName: file.name,
      storagePath,
      fileSize: file.size,
      userId: user.userId,
      ...(projectId ? { projectId } : {}),
    },
  })

  // TODO: disparar job assíncrono de extração de dados do PDF
  return NextResponse.json({ data: pdf }, { status: 201 })
}
