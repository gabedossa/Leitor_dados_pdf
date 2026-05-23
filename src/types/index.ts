export type ChartType = 'LINE' | 'BAR' | 'PIE'
export type DataSource = 'PDF' | 'MANUAL'
export type PdfStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED'

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
  details?: unknown
}

export interface ChartConfig {
  xAxisLabel?: string
  yAxisLabel?: string
  showLegend?: boolean
  showGrid?: boolean
  stacked?: boolean
}

export interface DataSeriesItem {
  name: string
  color?: string
}

export interface DataPointInput {
  label: string
  values: Record<string, number>
}

export interface CreateDataRecordBody {
  title: string
  description?: string
  source: DataSource
  recordDate?: string
  projectId?: string
  columns: DataSeriesItem[]
  points: DataPointInput[]
}

export interface CreateChartBody {
  title: string
  type: ChartType
  dataRecordId: string
  projectId?: string
  config?: ChartConfig
}
