'use client'

import {
  LineChart,
  BarChart,
  PieChart,
  Line,
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ChartType, ChartConfig, DataSeriesItem, DataPointInput } from '@/types'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

// Legenda em HTML puro (não o <Legend> do Recharts) para que o card cresça
// junto com a quantidade de itens em vez de um número fixo de linhas
// sobrepor o conteúdo seguinte.
function ChartLegend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-100 pt-3">
      {items.map((item, i) => (
        <div key={`${item.name}-${i}`} className="flex max-w-full items-center gap-1.5 text-xs text-gray-600">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="truncate">{item.name}</span>
        </div>
      ))}
    </div>
  )
}

interface ChartPreviewProps {
  type: ChartType
  title: string
  series: DataSeriesItem[]
  points: DataPointInput[]
  config?: ChartConfig
}

export default function ChartPreview({
  type,
  title,
  series,
  points,
  config = {},
}: ChartPreviewProps) {
  const { showLegend = true, showGrid = true, xAxisLabel, yAxisLabel, stacked = false } = config

  const chartData = points.map((p) => ({ name: p.label, ...p.values }))

  if (type === 'PIE') {
    const firstSeries = series[0]
    const rawSlices = points.map((p) => ({
      name: p.label,
      value: firstSeries ? (p.values[firstSeries.name] ?? 0) : 0,
    }))

    // Pizza legível fica em até ~6 fatias: acima disso, mantém as maiores
    // e agrupa o resto em "Outros" em vez de lotar a legenda com dezenas de itens.
    const MAX_SLICES = 6
    const sorted = [...rawSlices].sort((a, b) => b.value - a.value)
    const visible = sorted.length > MAX_SLICES ? sorted.slice(0, MAX_SLICES - 1) : sorted
    const overflow = sorted.length > MAX_SLICES ? sorted.slice(MAX_SLICES - 1) : []
    const othersTotal = overflow.reduce((sum, item) => sum + item.value, 0)

    const pieData = [
      ...visible.map((item, i) => ({ ...item, fill: COLORS[i % COLORS.length] })),
      ...(overflow.length > 0
        ? [{ name: `Outros (${overflow.length})`, value: othersTotal, fill: '#9ca3af' }]
        : []),
    ]

    return (
      <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200">
        <h3 className="mb-4 text-sm font-medium text-gray-700">{title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={110}
              stroke="#fff"
              strokeWidth={2}
              label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => value.toLocaleString('pt-BR')} />
          </PieChart>
        </ResponsiveContainer>
        {showLegend && (
          <ChartLegend items={pieData.map((d) => ({ name: d.name, color: d.fill }))} />
        )}
      </div>
    )
  }

  const axisProps = {
    xAxis: xAxisLabel
      ? { label: { value: xAxisLabel, position: 'insideBottom' as const, offset: -5 } }
      : {},
    yAxis: yAxisLabel
      ? { label: { value: yAxisLabel, angle: -90, position: 'insideLeft' as const } }
      : {},
  }

  const seriesLegendItems = series.map((s, i) => ({
    name: s.name,
    color: s.color ?? COLORS[i % COLORS.length],
  }))

  if (type === 'BAR') {
    return (
      <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200">
        <h3 className="mb-4 text-sm font-medium text-gray-700">{title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis dataKey="name" {...axisProps.xAxis} />
            <YAxis {...axisProps.yAxis} />
            <Tooltip />
            {series.map((s, i) => (
              <Bar
                key={s.name}
                dataKey={s.name}
                fill={s.color ?? COLORS[i % COLORS.length]}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        {showLegend && <ChartLegend items={seriesLegendItems} />}
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200">
      <h3 className="mb-4 text-sm font-medium text-gray-700">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
          <XAxis dataKey="name" {...axisProps.xAxis} />
          <YAxis {...axisProps.yAxis} />
          <Tooltip />
          {series.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={s.color ?? COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {showLegend && <ChartLegend items={seriesLegendItems} />}
    </div>
  )
}
