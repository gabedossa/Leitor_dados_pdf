import { redirect } from 'next/navigation'

// Login desabilitado: nunca mostra as páginas de auth, sempre vai para o dashboard.
export default function AuthLayout() {
  redirect('/dashboard')
}
