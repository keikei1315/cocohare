import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import Header from './components/Header'
import AlertTab from './components/AlertTab'

const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'CocoHare（ここはれ）| こころ晴れる毎日を',
  description: '無料性格診断・AIカウンセリング・じぶんノートで、あなたのしんどさに寄り添います。',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ここはれ',
  },
  openGraph: {
    title: 'CocoHare（ここはれ）| こころ晴れる毎日を',
    description: 'ちゃんと生きているのに、ずっとしんどい。そんなあなたの性格を20問で言語化します。',
    images: [{ url: '/logo.png', width: 800, height: 600 }],
    locale: 'ja_JP',
    type: 'website',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans" style={{ backgroundColor: '#FFF9F5' }}>
        <Header />
        {children}
        <AlertTab />
      </body>
    </html>
  )
}
