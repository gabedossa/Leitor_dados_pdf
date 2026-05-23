'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import ChartPreview from '@/components/charts/ChartPreview'
import type { ChartConfig, ChartType, DataPointInput, DataSeriesItem } from '@/types'

interface Project {
  id: string
  name: string
}

interface DataRecordSummary {
  id: string
  title: string
  projectId: string | null
  project?: { id: string; name: string } | null
}

interface DataRecordDetail {
  id: string
  title: string
  projectId: string | null
  columns: { id: string; name: string; color: string | null }[]
  points: {
    id: string
    label: string
    values: { dataColumnId: string; value: number }[]
  }[]
}

interface CreateChartResponse {
  data?: { id: string }
  error?: string
}

export default function NewChartForm({
  initialDataRecordId,
  initialProjectId,
}: {
  initialDataRecordId: string
  initialProjectId: string
}) {
  const router = useRouter()
  const [records, setRecords] = useState<DataRecordSummary[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedRecord, setSelectedRecord] = useState<DataRecordDetail | null>(null)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ChartType>('BAR')
  const [dataRecordId, setDataRecordId] = useState(initialDataRecordId)
  const [projectId, setProjectId] = useState(initialProjectId)
  const [showLegend, setShowLegend] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [stacked, setStacked] = useState(false)
  const [xAxisLabel, setXAxisLabel] = useState('')
  const [yAxisLabel, setYAxisLabel] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOptions() {
      setIsLoading(true)
      setError(null)
      try {
        const [recordsRes, projectsRes] = await Promise.all([
          fetch('/api/data-records'),
          fetch('/api/projects'),
        ])
        const [recordsBody, projectsBody] = await Promise.all([
          recordsRes.json().catch(() => ({})),
          projectsRes.json().catch(() => ({})),
        ])
        if (!recordsRes.ok) throw new Error(recordsBody.error ?? 'Erro ao carregar datasets.')
        if (!projectsRes.ok) throw new Error(projectsBody.error ?? 'Erro ao carregar projetos.')
        setRecords((recordsBody.data ?? []) as DataRecordSummary[])
        setProjects((projectsBody.data ?? []) as Project[])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados.')
      } finally {
        setIsLoading(false)
      }
    }

    loadOptions()
  }, [])

  useEffect(() => {
    if (!dataRecordId) {
      setSelectedRecord(null)
      return
    }

    let cancelled = false

    async function loadRecord() {
      setError(null)
      try {
        const res = await fetch(`/api/data-records/${dataRecordId}`)
        const body = (await res.json().catch(() => ({}))) as {
          data?: DataRecordDetail
          error?: string
        }

        if (!res.ok || !body.data) {
          setError(body.error ?? 'Dataset nao encontrado.')
          return
        }

        if (!cancelled) {
          setSelectedRecord(body.data)
          setProjectId((current) => current || body.data?.projectId || '')
          setTitle((current) => current || `Grafico de ${body.data?.title ?? 'dataset'}`)
        }
      } catch {
        if (!cancelled) setError('Erro ao carregar dataset.')
      }
    }

    loadRecord()
    return () => {
      cancelled = true
    }
  }, [dataRecordId])

  const previewData = useMemo(() => {
    if (!selectedRecord) return null

    const columnNameById = Object.fromEntries(
      selectedRecord.columns.map((column) => [column.id, column.name])
    )
    const series: DataSeriesItem[] = selectedRecord.columns.map((column) => ({
      name: column.name,
      color: column.color ?? undefined,
    }))
    const points: DataPointInput[] = selectedRecord.points.map((point) => ({
      label: point.label,
      values: Object.fromEntries(
        point.values
          .map((value) => [columnNameById[value.dataColumnId], value.value] as const)
          .filter(([name]) => Boolean(name))
      ),
    }))

    return { series, points }
  }, [selectedRecord])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!dataRecordId) {
      setError('Selecione um dataset.')
      return
    }

    setIsSubmitting(true)
    try {
      const config: ChartConfig = {
        showLegend,
        showGrid,
        stacked,
        xAxisLabel: xAxisLabel.trim() || undefined,
        yAxisLabel: yAxisLabel.trim() || undefined,
      }

      const res = await fetch('/api/charts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type,
          dataRecordId,
          projectId: projectId || undefined,
          config,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as CreateChartResponse

      if (!res.ok || !body.data?.id) {
        setError(body.error ?? 'Erro ao criar grafico.')
        return
      }

      router.push(`/dashboard/charts/${body.data.id}`)
      router.refresh()
    } catch {
      setError('Erro de conexao. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const previewConfig: ChartConfig = {
    showLegend,
    showGrid,
    stacked,
    xAxisLabel: xAxisLabel.trim() || undefined,
    yAxisLabel: yAxisLabel.trim() || undefined,
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/dashboard/charts" className="text-sm text-primary-600 hover:underline">
          Voltar para graficos
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-gray-900">Novo grafico</h1>
        <p className="text-sm text-gray-500">Escolha um dataset e configure a visualizacao.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 ring-1 ring-gray-200">
          <div className="space-y-5">
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Dataset</label>
              <select
                value={dataRecordId}
                onChange={(event) => {
                  setDataRecordId(event.target.value)
                  setSelectedRecord(null)
                }}
                disabled={isLoading}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-50"
              >
                <option value="">Selecione</option>
                {records.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.title}
                  </option>
                ))}
              </select>
              {!isLoading && records.length === 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  Nenhum dataset encontrado.{' '}
                  <Link href="/dashboard/data/new" className="text-primary-600 hover:underline">
                    Criar dataset
                  </Link>
                </p>
              )}
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
              <label className="mb-2 block text-sm font-medium text-gray-700">Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {(['BAR', 'LINE', 'PIE'] as ChartType[]).map((chartType) => (
                  <button
                    key={chartType}
                    type="button"
                    onClick={() => setType(chartType)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ring-1 transition ${
                      type === chartType
                        ? 'bg-primary-600 text-white ring-primary-600'
                        : 'text-gray-700 ring-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {chartType}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Eixo X</label>
                <input
                  value={xAxisLabel}
                  onChange={(event) => setXAxisLabel(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Eixo Y</label>
                <input
                  value={yAxisLabel}
                  onChange={(event) => setYAxisLabel(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Mostrar legenda', checked: showLegend, onChange: setShowLegend },
                { label: 'Mostrar grade', checked: showGrid, onChange: setShowGrid },
                { label: 'Empilhar barras', checked: stacked, onChange: setStacked },
              ].map((item) => (
                <label key={item.label} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(event) => item.onChange(event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  />
                  {item.label}
                </label>
              ))}
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Criando...' : 'Criar grafico'}
            </button>
          </div>
        </form>

        <div>
          {previewData ? (
            <ChartPreview
              type={type}
              title={title || 'Previa do grafico'}
              series={previewData.series}
              points={previewData.points}
              config={previewConfig}
            />
          ) : (
            <div className="rounded-xl bg-white p-12 text-center ring-1 ring-gray-200">
              <p className="text-sm text-gray-400">Selecione um dataset para ver a previa.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
