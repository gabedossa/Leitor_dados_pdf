'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ProjectResponse {
  data?: { id: string }
  error?: string
}

interface PdfResponse {
  data?: { id: string }
  error?: string
}

interface ExtractResponse {
  message?: string
  error?: string
  dataRecords?: { id: string; title: string }[]
  charts?: { id: string; title: string; type: string }[]
}

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    setStep('Criando projeto...')

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description.trim() || undefined,
          color,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as ProjectResponse

      if (!res.ok || !body.data?.id) {
        setError(body.error ?? 'Erro ao criar projeto.')
        setStep(null)
        return
      }

      const projectId = body.data.id

      if (file) {
        setStep('Enviando PDF...')
        const formData = new FormData()
        formData.append('file', file)
        formData.append('projectId', projectId)

        const pdfRes = await fetch('/api/pdfs', { method: 'POST', body: formData })
        const pdfBody = (await pdfRes.json().catch(() => ({}))) as PdfResponse

        if (!pdfRes.ok || !pdfBody.data?.id) {
          setError(
            `Projeto criado, mas o envio do PDF falhou: ${pdfBody.error ?? 'erro desconhecido'}. Você pode tentar novamente na página do projeto.`
          )
          router.push(`/dashboard/projects/${projectId}`)
          router.refresh()
          return
        }

        setStep('Extraindo dados e gerando gráficos...')
        const extractRes = await fetch(`/api/pdfs/${pdfBody.data.id}/extract`, { method: 'POST' })
        const extractBody = (await extractRes.json().catch(() => ({}))) as ExtractResponse

        if (!extractRes.ok) {
          setError(
            `Projeto e PDF criados, mas a extração falhou: ${extractBody.error ?? 'erro desconhecido'}.`
          )
          router.push(`/dashboard/projects/${projectId}`)
          router.refresh()
          return
        }
      }

      router.push(`/dashboard/projects/${projectId}`)
      router.refresh()
    } catch {
      setError('Erro de conexao. Tente novamente.')
    } finally {
      setIsSubmitting(false)
      setStep(null)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/dashboard/projects" className="text-sm text-primary-600 hover:underline">
          Voltar para projetos
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-gray-900">Novo projeto</h1>
        <p className="text-sm text-gray-500">Organize PDFs, datasets e graficos por contexto.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl rounded-xl bg-white p-6 ring-1 ring-gray-200"
      >
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Descricao</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cor</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-10 w-12 cursor-pointer rounded border border-gray-300 bg-white p-1"
              />
              <input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              PDF com dados (opcional)
            </label>
            <p className="mb-2 text-xs text-gray-400">
              Envie um PDF com uma tabela de dados e o sistema extrai os valores e gera os
              gráficos automaticamente assim que o projeto for criado.
            </p>
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border border-gray-300 text-sm text-gray-700 file:mr-4 file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
            />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? step ?? 'Criando...' : 'Criar projeto'}
            </button>
            <Link
              href="/dashboard/projects"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-300 transition hover:bg-gray-50"
            >
              Cancelar
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
