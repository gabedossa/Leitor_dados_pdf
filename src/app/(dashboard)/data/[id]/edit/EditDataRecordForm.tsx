'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Project {
  id: string
  name: string
}

interface ColumnDraft {
  name: string
  color: string
}

interface PointDraft {
  label: string
  values: string[]
}

interface DataRecordResponse {
  data?: {
    title: string
    description: string | null
    recordDate: string | null
    projectId: string | null
    columns: { id: string; name: string; color: string | null }[]
    points: {
      id: string
      label: string
      values: { dataColumnId: string; value: number }[]
    }[]
  }
  error?: string
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function EditDataRecordForm({ dataRecordId }: { dataRecordId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const chartId = searchParams.get('chartId')
  const backUrl = chartId ? `/dashboard/charts/${chartId}` : '/dashboard/charts'

  const [projects, setProjects] = useState<Project[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [recordDate, setRecordDate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [columns, setColumns] = useState<ColumnDraft[]>([])
  const [points, setPoints] = useState<PointDraft[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setError(null)
      try {
        const [recordRes, projectsRes] = await Promise.all([
          fetch(`/api/data-records/${dataRecordId}`),
          fetch('/api/projects'),
        ])
        const [recordBody, projectsBody] = await Promise.all([
          recordRes.json().catch(() => ({})) as Promise<DataRecordResponse>,
          projectsRes.json().catch(() => ({})) as Promise<{ data?: Project[] }>,
        ])

        if (!recordRes.ok || !recordBody.data) {
          setError(recordBody.error ?? 'Dataset não encontrado.')
          return
        }

        const record = recordBody.data
        setProjects(projectsBody.data ?? [])
        setTitle(record.title)
        setDescription(record.description ?? '')
        setRecordDate(record.recordDate ? record.recordDate.slice(0, 10) : '')
        setProjectId(record.projectId ?? '')
        setColumns(
          record.columns.map((c, i) => ({
            name: c.name,
            color: c.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
          }))
        )
        setPoints(
          record.points.map((point) => ({
            label: point.label,
            values: record.columns.map((column) => {
              const match = point.values.find((v) => v.dataColumnId === column.id)
              return match ? String(match.value) : '0'
            }),
          }))
        )
      } catch {
        setError('Erro ao carregar dataset.')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [dataRecordId])

  function updateColumn(index: number, patch: Partial<ColumnDraft>) {
    setColumns((current) =>
      current.map((column, i) => (i === index ? { ...column, ...patch } : column))
    )
  }

  function addColumn() {
    const nextIndex = columns.length
    setColumns((current) => [
      ...current,
      {
        name: `Serie ${nextIndex + 1}`,
        color: DEFAULT_COLORS[nextIndex % DEFAULT_COLORS.length],
      },
    ])
    setPoints((current) => current.map((point) => ({ ...point, values: [...point.values, '0'] })))
  }

  function removeColumn(index: number) {
    if (columns.length === 1) return
    setColumns((current) => current.filter((_, i) => i !== index))
    setPoints((current) =>
      current.map((point) => ({ ...point, values: point.values.filter((_, i) => i !== index) }))
    )
  }

  function updatePoint(index: number, patch: Partial<PointDraft>) {
    setPoints((current) =>
      current.map((point, i) => (i === index ? { ...point, ...patch } : point))
    )
  }

  function updateValue(pointIndex: number, columnIndex: number, value: string) {
    setPoints((current) =>
      current.map((point, i) => {
        if (i !== pointIndex) return point
        const values = [...point.values]
        values[columnIndex] = value
        return { ...point, values }
      })
    )
  }

  function addPoint() {
    setPoints((current) => [
      ...current,
      {
        label: `Item ${current.length + 1}`,
        values: columns.map(() => '0'),
      },
    ])
  }

  function removePoint(index: number) {
    if (points.length === 1) return
    setPoints((current) => current.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const cleanedColumns = columns.map((column) => ({
      name: column.name.trim(),
      color: column.color || undefined,
    }))
    const duplicateColumn = cleanedColumns.find(
      (column, index) => cleanedColumns.findIndex((c) => c.name === column.name) !== index
    )

    if (cleanedColumns.some((column) => !column.name)) {
      setError('Todas as series precisam de nome.')
      return
    }
    if (duplicateColumn) {
      setError('Use nomes diferentes para cada serie.')
      return
    }

    const cleanedPoints = points.map((point) => ({
      label: point.label.trim(),
      values: Object.fromEntries(
        cleanedColumns.map((column, index) => [column.name, Number(point.values[index] ?? 0)])
      ),
    }))

    if (cleanedPoints.some((point) => !point.label)) {
      setError('Todos os pontos precisam de rotulo.')
      return
    }
    if (
      cleanedPoints.some((point) =>
        Object.values(point.values).some((value) => Number.isNaN(value))
      )
    ) {
      setError('Todos os valores precisam ser numericos.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/data-records/${dataRecordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description.trim() || undefined,
          recordDate: recordDate ? new Date(`${recordDate}T00:00:00`).toISOString() : undefined,
          projectId: projectId || null,
          columns: cleanedColumns,
          points: cleanedPoints,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }

      if (!res.ok) {
        setError(body.error ?? 'Erro ao salvar dataset.')
        return
      }

      router.push(backUrl)
      router.refresh()
    } catch {
      setError('Erro de conexao. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">Carregando dataset...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href={backUrl} className="text-sm text-primary-600 hover:underline">
          Voltar
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-gray-900">Editar dataset</h1>
        <p className="text-sm text-gray-500">
          Ajuste series e pontos — os graficos que usam este dataset são atualizados
          automaticamente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl bg-white p-6 ring-1 ring-gray-200">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Titulo</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                maxLength={200}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Projeto</label>
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              >
                <option value="">Sem projeto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Data</label>
              <input
                type="date"
                value={recordDate}
                onChange={(event) => setRecordDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Descricao</label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 ring-1 ring-gray-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Series</h2>
            <button
              type="button"
              onClick={addColumn}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-primary-700 ring-1 ring-primary-200 transition hover:bg-primary-50"
            >
              Adicionar serie
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {columns.map((column, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="color"
                  value={column.color}
                  onChange={(event) => updateColumn(index, { color: event.target.value })}
                  className="h-10 w-12 cursor-pointer rounded border border-gray-300 bg-white p-1"
                />
                <input
                  value={column.name}
                  onChange={(event) => updateColumn(index, { name: event.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
                <button
                  type="button"
                  onClick={() => removeColumn(index)}
                  disabled={columns.length === 1}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-40"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 ring-1 ring-gray-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Pontos</h2>
            <button
              type="button"
              onClick={addPoint}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-primary-700 ring-1 ring-primary-200 transition hover:bg-primary-50"
            >
              Adicionar ponto
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500">
                  <th className="w-44 px-2 py-2">Rotulo</th>
                  {columns.map((column, index) => (
                    <th key={index} className="px-2 py-2">
                      {column.name || `Serie ${index + 1}`}
                    </th>
                  ))}
                  <th className="w-28 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {points.map((point, pointIndex) => (
                  <tr key={pointIndex} className="border-b border-gray-100 last:border-0">
                    <td className="px-2 py-2">
                      <input
                        value={point.label}
                        onChange={(event) => updatePoint(pointIndex, { label: event.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                    </td>
                    {columns.map((_, columnIndex) => (
                      <td key={columnIndex} className="px-2 py-2">
                        <input
                          type="number"
                          step="any"
                          value={point.values[columnIndex] ?? ''}
                          onChange={(event) =>
                            updateValue(pointIndex, columnIndex, event.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => removePoint(pointIndex)}
                        disabled={points.length === 1}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-40"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar alteracoes'}
          </button>
          <Link
            href={backUrl}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
