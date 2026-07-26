'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  projectId: string
  projectName: string
}

export default function DeleteProjectButton({ projectId, projectName }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    const confirmed = window.confirm(
      `Excluir o projeto "${projectName}"? Os datasets e gráficos vinculados deixam de pertencer a um projeto, mas não são apagados.`
    )
    if (!confirmed) return

    setIsDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      const body = (await res.json().catch(() => ({}))) as { error?: string }

      if (!res.ok) {
        setError(body.error ?? 'Erro ao excluir projeto.')
        return
      }

      router.push('/dashboard/projects')
      router.refresh()
    } catch {
      setError('Erro de conexão ao excluir projeto.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-50"
      >
        {isDeleting ? 'Excluindo...' : 'Excluir'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
