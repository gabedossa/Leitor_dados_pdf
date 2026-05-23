import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const user = await getAuthUser()
  if (!user) return null

  const [projectCount, chartCount, recordCount, recentCharts] = await Promise.all([
    prisma.project.count({ where: { userId: user.userId } }),
    prisma.chart.count({ where: { userId: user.userId } }),
    prisma.dataRecord.count({ where: { userId: user.userId } }),
    prisma.chart.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { project: { select: { name: true } } },
    }),
  ])

  const stats = [
    { label: 'Projetos', value: projectCount },
    { label: 'Gráficos', value: chartCount },
    { label: 'Conjuntos de dados', value: recordCount },
  ]

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mb-8 text-sm text-gray-500">Visão geral da sua conta</p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-white p-6 ring-1 ring-gray-200">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white ring-1 ring-gray-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Gráficos recentes</h2>
        </div>
        {recentCharts.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">
            Nenhum gráfico criado ainda.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentCharts.map((chart) => (
              <li key={chart.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{chart.title}</p>
                  <p className="text-xs text-gray-400">{chart.project?.name ?? 'Sem projeto'}</p>
                </div>
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {chart.type}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
