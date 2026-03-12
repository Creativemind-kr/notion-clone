import type { Metadata } from 'next'
import { Nanum_Gothic, Nanum_Myeongjo, Noto_Sans_KR, Noto_Serif_KR, Inter, Roboto, Playfair_Display, Merriweather, Lato, Source_Code_Pro } from 'next/font/google'
import './globals.css'

const naumGothic = Nanum_Gothic({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-nanum-gothic', display: 'swap' })
const naumMyeongjo = Nanum_Myeongjo({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-nanum-myeongjo', display: 'swap' })
const notoSansKR = Noto_Sans_KR({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-noto-sans-kr', display: 'swap' })
const notoSerifKR = Noto_Serif_KR({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-noto-serif-kr', display: 'swap' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-roboto', display: 'swap' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
const merriweather = Merriweather({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-merriweather', display: 'swap' })
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-lato', display: 'swap' })
const sourceCodePro = Source_Code_Pro({ subsets: ['latin'], variable: '--font-source-code-pro', display: 'swap' })

export const metadata: Metadata = {
  title: '스브스 전용 메모장★',
  description: '스브스 전용 메모장',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const fontVars = [
    naumGothic.variable, naumMyeongjo.variable, notoSansKR.variable, notoSerifKR.variable,
    inter.variable, roboto.variable, playfair.variable, merriweather.variable,
    lato.variable, sourceCodePro.variable,
  ].join(' ')

  return (
    <html lang="ko" className={fontVars}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css" />
      </head>
      <body>{children}</body>
    </html>
  )
}
