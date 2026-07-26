'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ChartPreview from '@/components/charts/ChartPreview'
import type { ChartConfig, ChartType, DataPointInput, DataSeriesItem } from '@/types'

const TYPE_LABELS: Record<ChartType, string> = {
  BAR: 'Barra',
  LINE: 'Linha',
  PIE: 'Pizza',
}

interface Props {
  chartId: string
  title: string
  initialType: ChartType
  series: DataSeriesItem[]
  points: DataPointInput[]
  config: ChartConfig
}

export default function ChartTypeSwitcher({
  chartId,
  title,
  initialType,
  series,
  points,
  config,
}: Props) {
  const router = useRouter()
  const [type, setType] = useState<ChartType>(initialType)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSelect(newType: ChartType) {
    if (newType === type || isSaving) return

    const previousType = type
    setType(newType)
    setError(null)
    setIsSaving(true)

    try {
      const res = await fetch(`/api/charts/${chartId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setType(previousType)
        setError(body.error ?? 'Erro ao alterar tipo do gráfico.')
        return
      }

      router.refresh()
    } catch {
      setType(previousType)
      setError('Erro de conexão ao alterar tipo do gráfico.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(['BAR', 'LINE', 'PIE'] as ChartType[]).map((chartType) => (
          <button
            key={chartType}
            type="button"
            onClick={() => handleSelect(chartType)}
            disabled={isSaving}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition disabled:opacity-50 ${
              type === chartType
                ? 'bg-primary-600 text-white ring-primary-600'
                : 'text-gray-700 ring-gray-300 hover:bg-gray-50'
            }`}
          >
            {TYPE_LABELS[chartType]}
          </button>
        ))}
        {isSaving && <span className="text-xs text-gray-400">Salvando...</span>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ChartPreview type={type} title={title} series={series} points={points} config={config} />
    </div>
  )
}
