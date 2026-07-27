import EditDataRecordForm from './EditDataRecordForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditDataRecordPage({ params }: Props) {
  const { id } = await params
  return <EditDataRecordForm dataRecordId={id} />
}
