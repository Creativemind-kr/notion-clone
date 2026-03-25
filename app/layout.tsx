import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nomix',
  description: 'Nomix의 저장공간',
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
