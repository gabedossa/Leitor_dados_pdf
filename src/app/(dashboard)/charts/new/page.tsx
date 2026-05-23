import NewChartForm from './NewChartForm'

interface Props {
  searchParams: Promise<{ dataRecordId?: string; projectId?: string }>
}

export default async function NewChartPage({ searchParams }: Props) {
  const params = await searchParams
  return (
    <NewChartForm
      initialDataRecordId={params.dataRecordId ?? ''}
      initialProjectId={params.projectId ?? ''}
    />
  )
}
