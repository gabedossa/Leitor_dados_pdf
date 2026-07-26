import Link from 'next/link'
import { notFound } from 'next/navigation'
import ChartTypeSwitcher from '@/components/charts/ChartTypeSwitcher'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import type { ChartConfig, DataPointInput, DataSeriesItem } from '@/types'
import ShareChartForm from './ShareChartForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ChartDetailPage({ params }: Props) {
  const user = await getAuthUser()
  if (!user) return null

  const { id } = await params
  const chart = await prisma.chart.findFirst({
    where: { id, userId: user.userId },
    include: {
      project: { select: { id: true, name: true } },
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

  if (!chart) notFound()

  const columnNameById = new Map(chart.dataRecord.columns.map((column) => [column.id, column.name]))
  const series: DataSeriesItem[] = chart.dataRecord.columns.map((column) => ({
    name: column.name,
    color: column.color ?? undefined,
  }))
  const points: DataPointInput[] = chart.dataRecord.points.map((point) => {
    const values: Record<string, number> = {}
    for (const value of point.values) {
      const columnName = columnNameById.get(value.dataColumnId)
      if (columnName) values[columnName] = value.value
    }
    return { label: point.label, values }
  })
  const config = (chart.config ?? {}) as ChartConfig

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/dashboard/charts" className="text-sm text-primary-600 hover:underline">
            Voltar para graficos
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">{chart.title}</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {chart.dataRecord.title} - {chart.project?.name ?? 'Sem projeto'} -{' '}
            {formatDate(chart.createdAt)}
          </p>
        </div>
        <Link
          href={`/dashboard/charts/new?dataRecordId=${chart.dataRecordId}${
            chart.projectId ? `&projectId=${chart.projectId}` : ''
          }`}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50"
        >
          Criar outro grafico
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <ChartTypeSwitcher
          chartId={chart.id}
          title={chart.title}
          initialType={chart.type}
          series={series}
          points={points}
          config={config}
        />
        <ShareChartForm chartId={chart.id} />
      </div>
    </div>
  )
}
