'use client'

import { useState } from 'react'

export default function ShareChartForm({ chartId }: { chartId: string }) {
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('')
  const [includeData, setIncludeData] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus(null)
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/charts/${chartId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          message: message.trim() || undefined,
          includeData,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string }

      if (!res.ok) {
        setError(body.error ?? 'Erro ao compartilhar grafico.')
        return
      }

      setStatus(body.message ?? 'Grafico compartilhado.')
      setTo('')
      setMessage('')
      setIncludeData(false)
    } catch {
      setError('Erro de conexao. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-white p-6 ring-1 ring-gray-200">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Compartilhar</h2>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
          <input
            type="email"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Mensagem</label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={includeData}
            onChange={(event) => setIncludeData(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600"
          />
          Incluir CSV dos dados
        </label>

        {status && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{status}</p>
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar por e-mail'}
        </button>
      </div>
    </form>
  )
}
