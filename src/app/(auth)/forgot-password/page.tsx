'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSent(true)
  }

  if (sent) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">E-mail enviado</h2>
        <p className="mb-4 text-sm text-gray-500">
          Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.
        </p>
        <Link href="/login" className="text-sm text-primary-600 hover:underline">
          Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
      <h1 className="mb-1 text-2xl font-semibold text-gray-900">Recuperar senha</h1>
      <p className="mb-6 text-sm text-gray-500">
        Enviaremos um link de redefinição para seu e-mail.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary-600 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar link'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        <Link href="/login" className="text-primary-600 hover:underline">
          Voltar ao login
        </Link>
      </p>
    </div>
  )
}
