'use client'

import { useEffect, useState } from 'react'
import CalendarView from '@/components/CalendarView'

export default function CalendarPage() {
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    setUserName(localStorage.getItem('workspace_user'))
  }, [])

  if (!userName) return null

  return <CalendarView userName={userName} />
}
