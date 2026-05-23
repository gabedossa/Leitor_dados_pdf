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
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChartType, ChartConfig, DataSeriesItem, DataPointInput } from '@/types'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

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
    const pieData = points.map((p, i) => ({
      name: p.label,
      value: firstSeries ? (p.values[firstSeries.name] ?? 0) : 0,
      fill: COLORS[i % COLORS.length],
    }))

    return (
      <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200">
        <h3 className="mb-4 text-sm font-medium text-gray-700">{title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110}>
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
            {showLegend && <Legend />}
          </PieChart>
        </ResponsiveContainer>
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
            {showLegend && <Legend />}
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
          {showLegend && <Legend />}
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
    </div>
  )
}
