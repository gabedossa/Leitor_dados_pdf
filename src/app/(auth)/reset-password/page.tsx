import ResetPasswordForm from './ResetPasswordForm'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams
  return <ResetPasswordForm token={params.token ?? ''} />
}
