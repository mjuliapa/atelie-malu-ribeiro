import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ateliê Malu Ribeiro',
  description: 'Cerâmica autoral — plataforma de gestão',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ateliê Malu',
  },
  openGraph: {
    title: 'Ateliê Malu Ribeiro',
    description: 'Cerâmica autoral',
    url: 'https://atelie-malu-ribeiro.vercel.app',
    siteName: 'Ateliê Malu Ribeiro',
    images: [
      {
        url: 'https://atelie-malu-ribeiro.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Ateliê Malu Ribeiro',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#C8B9A8',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}