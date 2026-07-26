import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { sendChartShareEmail, sendDataShareEmail } from '@/lib/email'
import { buildDataPdf } from '@/lib/data-pdf'

const schema = z.object({
  to: z.string().email('E-mail de destino inválido'),
  message: z.string().max(500).optional(),
  includeData: z.boolean().default(false),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { to, message, includeData } = parsed.data

  // Busca o gráfico com dados do usuário remetente e do dataset
  const chart = await prisma.chart.findFirst({
    where: { id, userId: user.userId },
    include: {
      user: { select: { name: true } },
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

  try {
    // Envia link do gráfico
    await sendChartShareEmail({
      to,
      senderName: chart.user.name,
      chartTitle: chart.title,
      chartId: chart.id,
      message,
    })

    // Envia PDF dos dados junto se solicitado
    if (includeData) {
      const pdf = await buildDataPdf(chart.dataRecord.title, chart.dataRecord)
      await sendDataShareEmail({
        to,
        senderName: chart.user.name,
        dataTitle: chart.dataRecord.title,
        pdfContent: pdf,
        message,
      })
    }
  } catch (err) {
    const details = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json(
      { error: 'Falha ao enviar o e-mail. Verifique a configuração de SMTP.', details },
      { status: 502 }
    )
  }

  return NextResponse.json({ message: 'E-mail enviado com sucesso' })
}
