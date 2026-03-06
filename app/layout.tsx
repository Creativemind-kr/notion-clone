import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '우리 팀 워크스페이스',
  description: '팀 공유 노트 앱',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
