import NewDataRecordForm from './NewDataRecordForm'

interface Props {
  searchParams: Promise<{ projectId?: string }>
}

export default async function NewDataRecordPage({ searchParams }: Props) {
  const params = await searchParams
  return <NewDataRecordForm initialProjectId={params.projectId ?? ''} />
}
