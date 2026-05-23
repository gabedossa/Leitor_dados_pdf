import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const user = await getAuthUser()
  if (!user) return null

  const { id } = await params

  const project = await prisma.project.findFirst({
    where: { id, userId: user.userId },
    include: {
      company: true,
      dataRecords: {
        include: { _count: { select: { columns: true, points: true } } },
        orderBy: { createdAt: 'desc' },
      },
      charts: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!project) notFound()

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: project.color ?? '#3b82f6' }}
            />
            <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
          </div>
          {project.company && <p className="text-sm text-gray-400">{project.company.name}</p>}
          {project.description && (
            <p className="mt-1 text-sm text-gray-500">{project.description}</p>
          )}
        </div>
        <Link
          href={`/dashboard/projects/${id}/edit`}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50"
        >
          Editar
        </Link>
      </div>

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Conjuntos de dados</h2>
          <Link
            href={`/dashboard/data/new?projectId=${id}`}
            className="text-sm text-primary-600 hover:underline"
          >
            + Novo dataset
          </Link>
        </div>
        {project.dataRecords.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum dataset neste projeto.</p>
        ) : (
          <div className="space-y-2">
            {project.dataRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between rounded-lg bg-white px-4 py-3 ring-1 ring-gray-200"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{record.title}</p>
                  <p className="text-xs text-gray-400">
                    {record._count.columns} série(s) · {record._count.points} pontos ·{' '}
                    {record.source === 'PDF' ? 'PDF' : 'Manual'} ·{' '}
                    {formatDate(record.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Gráficos</h2>
          <Link
            href={`/dashboard/charts/new?projectId=${id}`}
            className="text-sm text-primary-600 hover:underline"
          >
            + Novo gráfico
          </Link>
        </div>
        {project.charts.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum gráfico neste projeto.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {project.charts.map((chart) => (
              <div
                key={chart.id}
                className="rounded-lg bg-white px-4 py-3 ring-1 ring-gray-200"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{chart.title}</p>
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {chart.type}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{formatDate(chart.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
