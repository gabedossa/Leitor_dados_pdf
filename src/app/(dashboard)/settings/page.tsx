'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual obrigatória'),
    newPassword: z.string().min(8, 'Nova senha deve ter ao menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })

type ProfileData = z.infer<typeof profileSchema>
type PasswordData = z.infer<typeof passwordSchema>

export default function SettingsPage() {
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)

  const profileForm = useForm<ProfileData>({ resolver: zodResolver(profileSchema) })
  const passwordForm = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) })
  const { reset: resetProfile } = profileForm

  useEffect(() => {
    async function loadProfile() {
      const res = await fetch('/api/users/me')
      const body = (await res.json().catch(() => ({}))) as {
        data?: ProfileData
        error?: string
      }

      if (res.ok && body.data) {
        resetProfile({ name: body.data.name, email: body.data.email })
      } else if (body.error) {
        setProfileMsg(body.error)
      }
    }

    loadProfile()
  }, [resetProfile])

  async function onProfileSubmit(data: ProfileData) {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    setProfileMsg(
      res.ok ? 'Perfil atualizado com sucesso.' : (body.error ?? 'Erro ao atualizar perfil.')
    )
  }

  async function onPasswordSubmit(data: PasswordData) {
    const res = await fetch('/api/users/me/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setPasswordMsg('Senha atualizada com sucesso.')
      passwordForm.reset()
    } else {
      const body = await res.json()
      setPasswordMsg(body.error ?? 'Erro ao atualizar senha.')
    }
  }

  return (
    <div className="p-8">
      <h1 className="mb-8 text-2xl font-semibold text-gray-900">Configurações</h1>

      <div className="max-w-lg space-y-8">
        <section className="rounded-xl bg-white p-6 ring-1 ring-gray-200">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Perfil</h2>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            {[
              { id: 'name', label: 'Nome', type: 'text' },
              { id: 'email', label: 'E-mail', type: 'email' },
            ].map(({ id, label, type }) => (
              <div key={id}>
                <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
                <input
                  {...profileForm.register(id as keyof ProfileData)}
                  type={type}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            ))}
            {profileMsg && <p className="text-sm text-green-600">{profileMsg}</p>}
            <button
              type="submit"
              disabled={profileForm.formState.isSubmitting}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              Salvar alterações
            </button>
          </form>
        </section>

        <section className="rounded-xl bg-white p-6 ring-1 ring-gray-200">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Alterar senha</h2>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            {[
              { id: 'currentPassword', label: 'Senha atual' },
              { id: 'newPassword', label: 'Nova senha' },
              { id: 'confirmPassword', label: 'Confirmar nova senha' },
            ].map(({ id, label }) => (
              <div key={id}>
                <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
                <input
                  {...passwordForm.register(id as keyof PasswordData)}
                  type="password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            ))}
            {passwordMsg && <p className="text-sm text-green-600">{passwordMsg}</p>}
            <button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              Atualizar senha
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
