'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  chartId: string
  chartTitle: string
  className?: string
  /** Where to navigate after a successful delete. Omit to just refresh the current page (list view). */
  redirectTo?: string
}

export default function DeleteChartButton({ chartId, chartTitle, className, redirectTo }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    const confirmed = window.confirm(`Excluir o gráfico "${chartTitle}"?`)
    if (!confirmed) return

    setIsDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/charts/${chartId}`, { method: 'DELETE' })
      const body = (await res.json().catch(() => ({}))) as { error?: string }

      if (!res.ok) {
        setError(body.error ?? 'Erro ao excluir gráfico.')
        return
      }

      if (redirectTo) {
        router.push(redirectTo)
      }
      router.refresh()
    } catch {
      setError('Erro de conexão ao excluir gráfico.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className={cn('flex items-center', className)}>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label="Excluir gráfico"
        title="Excluir gráfico"
        className="rounded-md p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
