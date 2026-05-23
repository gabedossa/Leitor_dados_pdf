import Link from 'next/link'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

export default async function ProjectsPage() {
  const user = await getAuthUser()
  if (!user) return null

  const projects = await prisma.project.findMany({
    where: { userId: user.userId },
    include: {
      company: true,
      _count: { select: { dataRecords: true, charts: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projetos</h1>
          <p className="text-sm text-gray-500">{projects.length} projeto(s)</p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
        >
          Novo projeto
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center ring-1 ring-gray-200">
          <p className="text-sm text-gray-400">Nenhum projeto ainda. Crie o primeiro!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group rounded-xl bg-white p-6 ring-1 ring-gray-200 transition hover:ring-primary-300"
            >
              <div className="mb-3 flex items-start justify-between">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: project.color ?? '#3b82f6' }}
                />
                <span className="text-xs text-gray-400">{formatDate(project.createdAt)}</span>
              </div>
              <h2 className="mb-1 font-medium text-gray-900 group-hover:text-primary-600">
                {project.name}
              </h2>
              {project.company && (
                <p className="mb-3 text-xs text-gray-400">{project.company.name}</p>
              )}
              <div className="flex gap-4 text-xs text-gray-500">
                <span>{project._count.dataRecords} datasets</span>
                <span>{project._count.charts} gráficos</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
