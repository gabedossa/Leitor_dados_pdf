import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { extractFromPdf } from '@/lib/pdf-extractor'

// Escolhe um tipo de gráfico razoável a partir do formato dos dados extraídos.
function pickChartType(columnCount: number, pointCount: number): 'BAR' | 'LINE' | 'PIE' {
  if (columnCount === 1 && pointCount <= 8) return 'PIE'
  if (pointCount > 12) return 'LINE'
  return 'BAR'
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  // Busca o PDF e verifica posse
  const pdf = await prisma.pdfDocument.findFirst({
    where: { id, userId: user.userId },
  })
  if (!pdf) return NextResponse.json({ error: 'PDF não encontrado' }, { status: 404 })

  if (pdf.status === 'PROCESSING') {
    return NextResponse.json({ error: 'Extração já em andamento' }, { status: 409 })
  }

  // Marca como em processamento
  await prisma.pdfDocument.update({
    where: { id },
    data: { status: 'PROCESSING', errorMessage: null },
  })

  try {
    const absolutePath = path.join(process.cwd(), pdf.storagePath)
    const result = await extractFromPdf(absolutePath)

    if (result.tables.length === 0) {
      await prisma.pdfDocument.update({
        where: { id },
        data: {
          status: 'PROCESSED',
          errorMessage: 'Nenhuma tabela de dados detectada no PDF.',
        },
      })

      return NextResponse.json({
        message: 'PDF processado, mas nenhuma tabela foi detectada.',
        pageCount: result.pageCount,
        tablesFound: 0,
      })
    }

    // Cria um DataRecord (+ gráfico automático) por tabela detectada.
    // Usa createMany/createManyAndReturn em vez de um create por linha: com o banco
    // remoto (Neon), uma tabela com muitas linhas facilmente estourava o timeout
    // padrão de transação interativa do Prisma (5s) por excesso de round-trips.
    const { records: createdRecords, charts: createdCharts } = await prisma.$transaction(
      async (tx) => {
        const records = []
        const charts = []

        for (const [tableIndex, table] of result.tables.entries()) {
          // Filtra colunas inválidas e pontos sem nenhum valor numérico
          const validColumns = table.columns.filter((c) => c.trim())
          const validPoints = table.points.filter(
            (p) => p.label.trim() && Object.keys(p.values).length > 0
          )

          if (validColumns.length === 0 || validPoints.length === 0) continue

          const title = table.title ?? `${pdf.originalName} — Tabela ${tableIndex + 1}`

          const dataRecord = await tx.dataRecord.create({
            data: {
              title,
              source: 'PDF',
              userId: user.userId,
              projectId: pdf.projectId,
              pdfDocumentId: pdf.id,
            },
          })

          const createdColumns = await tx.dataColumn.createManyAndReturn({
            data: validColumns.map((name, i) => ({
              name,
              dataRecordId: dataRecord.id,
              displayOrder: i,
            })),
          })
          const columnMap = Object.fromEntries(createdColumns.map((c) => [c.name, c.id]))

          const createdPoints = await tx.dataPoint.createManyAndReturn({
            data: validPoints.map((point, i) => ({
              label: point.label,
              dataRecordId: dataRecord.id,
              displayOrder: i,
            })),
          })

          const dataValues = validPoints.flatMap((point, i) =>
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

          const chart = await tx.chart.create({
            data: {
              title: `Gráfico de ${title}`,
              type: pickChartType(validColumns.length, validPoints.length),
              userId: user.userId,
              projectId: pdf.projectId,
              dataRecordId: dataRecord.id,
              config: { showLegend: true, showGrid: true },
            },
          })

          records.push(dataRecord)
          charts.push(chart)
        }

        return { records, charts }
      },
      { timeout: 30000 }
    )

    await prisma.pdfDocument.update({
      where: { id },
      data: { status: 'PROCESSED' },
    })

    return NextResponse.json({
      message: `Extração concluída. ${createdRecords.length} conjunto(s) de dados e ${createdCharts.length} gráfico(s) gerado(s) automaticamente.`,
      pageCount: result.pageCount,
      tablesFound: result.tables.length,
      dataRecords: createdRecords.map((r) => ({ id: r.id, title: r.title })),
      charts: createdCharts.map((c) => ({ id: c.id, title: c.title, type: c.type })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'

    await prisma.pdfDocument.update({
      where: { id },
      data: { status: 'FAILED', errorMessage: message },
    })

    return NextResponse.json(
      { error: 'Falha na extração do PDF', details: message },
      { status: 500 }
    )
  }
}
