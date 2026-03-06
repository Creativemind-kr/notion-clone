import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '스브스 전용 메모장★',
  description: '스브스 전용 메모장',
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
