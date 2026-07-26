import Link from 'next/link'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import DeleteChartButton from '@/components/charts/DeleteChartButton'

export default async function ChartsPage() {
  const user = await getAuthUser()
  if (!user) return null

  const charts = await prisma.chart.findMany({
    where: { userId: user.userId },
    include: {
      project: { select: { id: true, name: true } },
      dataRecord: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Graficos</h1>
          <p className="text-sm text-gray-500">{charts.length} grafico(s)</p>
        </div>
        <Link
          href="/dashboard/charts/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
        >
          Novo grafico
        </Link>
      </div>

      {charts.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center ring-1 ring-gray-200">
          <p className="text-sm text-gray-400">Nenhum grafico criado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {charts.map((chart) => (
            <div
              key={chart.id}
              className="group rounded-xl bg-white p-6 ring-1 ring-gray-200 transition hover:ring-primary-300"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {chart.type}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{formatDate(chart.createdAt)}</span>
                  <DeleteChartButton chartId={chart.id} chartTitle={chart.title} />
                </div>
              </div>
              <Link href={`/dashboard/charts/${chart.id}`} className="block">
                <h2 className="font-medium text-gray-900 group-hover:text-primary-600">
                  {chart.title}
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  {chart.dataRecord.title} - {chart.project?.name ?? 'Sem projeto'}
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
