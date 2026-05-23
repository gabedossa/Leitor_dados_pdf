'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const schema = z
  .object({
    name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
      })
      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        const body = await res.json().catch(() => ({}))
        setServerError((body as { error?: string }).error ?? 'Erro ao criar conta')
      }
    } catch {
      setServerError('Erro de conexão. Verifique sua internet e tente novamente.')
    }
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Criar conta</h1>
      <p className="mb-6 text-sm text-gray-500">Comece a visualizar seus dados</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {[
          { id: 'name', label: 'Nome', type: 'text', autoComplete: 'name' },
          { id: 'email', label: 'E-mail', type: 'email', autoComplete: 'email' },
          { id: 'password', label: 'Senha', type: 'password', autoComplete: 'new-password' },
          {
            id: 'confirmPassword',
            label: 'Confirmar senha',
            type: 'password',
            autoComplete: 'new-password',
          },
        ].map(({ id, label, type, autoComplete }) => (
          <div key={id}>
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            <input
              {...register(id as keyof FormData)}
              type={type}
              autoComplete={autoComplete}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            {errors[id as keyof FormData] && (
              <p className="mt-1 text-xs text-red-600">
                {errors[id as keyof FormData]?.message}
              </p>
            )}
          </div>
        ))}

        {serverError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{serverError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary-600 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Já tem conta?{' '}
        <Link href="/login" className="text-primary-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
