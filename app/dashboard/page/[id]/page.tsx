'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import EditorWrapper from '@/components/EditorWrapper'

interface Page {
  id: string
  title: string
  content: string
}

export default function PageDetail() {
  const params = useParams()
  const id = params.id as string
  const [page, setPage] = useState<Page | null>(null)
  const [notFound, setNotFound] = useState(false)
  const supabase = useRef(createClient())

  useEffect(() => {
    supabase.current
      .from('pages')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) setPage(data)
        else setNotFound(true)
      })
  }, [id])

  if (notFound) return (
    <div className="flex items-center justify-center h-full text-gray-400">
      페이지를 찾을 수 없어요.
    </div>
  )

  if (!page) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
      불러오는 중...
    </div>
  )

  return <EditorWrapper page={page} />
}
