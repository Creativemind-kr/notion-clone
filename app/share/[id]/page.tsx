import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import SharePageClient from './SharePageClient'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('pages').select('title').eq('id', id).single()
  const title = data?.title || '스브스 메모장'
  return {
    title,
    openGraph: { title, type: 'article' },
    twitter: { card: 'summary', title },
  }
}

export default async function SharePage({ params }: Props) {
  const { id } = await params
  return <SharePageClient id={id} />
}
