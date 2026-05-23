'use client'

import { useEffect, useState } from 'react'
import { formatBytes, formatDate } from '@/lib/utils'

interface Project {
  id: string
  name: string
}

interface PdfDocument {
  id: string
  originalName: string
  fileSize: number
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED'
  errorMessage: string | null
  createdAt: string
  projectId: string | null
}

const statusClasses: Record<PdfDocument['status'], string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  PROCESSING: 'bg-blue-50 text-blue-700',
  PROCESSED: 'bg-green-50 text-green-700',
  FAILED: 'bg-red-50 text-red-700',
}

const statusLabels: Record<PdfDocument['status'], string> = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  PROCESSED: 'Processado',
  FAILED: 'Falhou',
}

export default function PdfsPage() {
  const [pdfs, setPdfs] = useState<PdfDocument[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [activePdfId, setActivePdfId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  async function loadInitialData() {
    setIsLoading(true)
    setError(null)
    try {
      const [pdfRes, projectRes] = await Promise.all([fetch('/api/pdfs'), fetch('/api/projects')])
      const [pdfBody, projectBody] = await Promise.all([
        pdfRes.json().catch(() => ({})),
        projectRes.json().catch(() => ({})),
      ])

      if (!pdfRes.ok) throw new Error(pdfBody.error ?? 'Erro ao carregar PDFs.')
      if (!projectRes.ok) throw new Error(projectBody.error ?? 'Erro ao carregar projetos.')

      setPdfs((pdfBody.data ?? []) as PdfDocument[])
      setProjects((projectBody.data ?? []) as Project[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setError('Selecione um arquivo PDF.')
      return
    }

    setIsUploading(true)
    setError(null)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (projectId) formData.append('projectId', projectId)

      const res = await fetch('/api/pdfs', { method: 'POST', body: formData })
      const body = (await res.json().catch(() => ({}))) as { error?: string; data?: PdfDocument }

      if (!res.ok || !body.data) {
        setError(body.error ?? 'Erro ao enviar PDF.')
        return
      }

      setPdfs((current) => [body.data as PdfDocument, ...current])
      setFile(null)
      setMessage('PDF enviado com sucesso.')
      event.currentTarget.reset()
    } catch {
      setError('Erro de conexao ao enviar PDF.')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleExtract(pdfId: string) {
    setActivePdfId(pdfId)
    setError(null)
    setMessage(null)

    try {
      const res = await fetch(`/api/pdfs/${pdfId}/extract`, { method: 'POST' })
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string }

      if (!res.ok) {
        setError(body.error ?? 'Erro ao extrair dados.')
        return
      }

      setMessage(body.message ?? 'Extracao concluida.')
      await loadInitialData()
    } catch {
      setError('Erro de conexao ao extrair dados.')
    } finally {
      setActivePdfId(null)
    }
  }

  async function handleDelete(pdfId: string) {
    const shouldDelete = window.confirm('Excluir este PDF? Os datasets extraidos ficam no sistema.')
    if (!shouldDelete) return

    setActivePdfId(pdfId)
    setError(null)
    setMessage(null)

    try {
      const res = await fetch(`/api/pdfs/${pdfId}`, { method: 'DELETE' })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(body.error ?? 'Erro ao excluir PDF.')
        return
      }
      setPdfs((current) => current.filter((pdf) => pdf.id !== pdfId))
      setMessage('PDF excluido.')
    } catch {
      setError('Erro de conexao ao excluir PDF.')
    } finally {
      setActivePdfId(null)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">PDFs</h1>
        <p className="text-sm text-gray-500">Envie arquivos e transforme tabelas em datasets.</p>
      </div>

      <form onSubmit={handleUpload} className="mb-8 rounded-xl bg-white p-6 ring-1 ring-gray-200">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Arquivo PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border border-gray-300 text-sm text-gray-700 file:mr-4 file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
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

          <button
            type="submit"
            disabled={isUploading}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {isUploading ? 'Enviando...' : 'Enviar PDF'}
          </button>
        </div>
      </form>

      {message && (
        <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}
      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="rounded-xl bg-white ring-1 ring-gray-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Arquivos enviados</h2>
        </div>

        {isLoading ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Carregando PDFs...</p>
        ) : pdfs.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Nenhum PDF enviado ainda.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pdfs.map((pdf) => (
              <li key={pdf.id} className="px-6 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{pdf.originalName}</p>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${statusClasses[pdf.status]}`}
                      >
                        {statusLabels[pdf.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatBytes(pdf.fileSize)} - enviado em {formatDate(pdf.createdAt)}
                    </p>
                    {pdf.errorMessage && (
                      <p className="mt-2 text-xs text-red-600">{pdf.errorMessage}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExtract(pdf.id)}
                      disabled={activePdfId === pdf.id || pdf.status === 'PROCESSING'}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-primary-700 ring-1 ring-primary-200 transition hover:bg-primary-50 disabled:opacity-50"
                    >
                      {activePdfId === pdf.id ? 'Processando...' : 'Extrair'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(pdf.id)}
                      disabled={activePdfId === pdf.id}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
