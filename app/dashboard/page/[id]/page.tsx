import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditorWrapper from '@/components/EditorWrapper'

export default async function PageDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('id', id)
    .single()

  if (!page) {
    notFound()
  }

  return <EditorWrapper page={page} />
}
