import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import SharePageClient from './SharePageClient'

// 공개 공유 페이지용 — 세션 없이 anon 키로 직접 읽기
const supabase = createClient(
  'https://biuojrtaitzgodfcpzja.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpdW9qcnRhaXR6Z29kZmNwemphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzEzODQsImV4cCI6MjA4ODM0NzM4NH0.LnAOmrwHUVL5-LJwzHe_W9hx1nLwc5D7UpX8Zl78P1E'
)

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { data } = await supabase
    .from('pages')
    .select('title')
    .eq('id', id)
    .single()

  const title = data?.title?.trim() || 'Nomix의 저장공간'
  const url = `https://notion-clone-beta-jade.vercel.app/share/${id}`

  return {
    title,
    openGraph: {
      title,
      type: 'article',
      url,
      siteName: title,
    },
    twitter: {
      card: 'summary',
      title,
    },
  }
}

export default async function SharePage({ params }: Props) {
  const { id } = await params
  return <SharePageClient id={id} />
}
