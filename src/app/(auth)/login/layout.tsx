import type { Metadata } from 'next'

export const metadata: Metadata = {
  openGraph: {
    title: 'Ateliê Malu Ribeiro',
    description: 'Cerâmica autoral',
    images: [
      {
        url: 'https://atelie-malu-ribeiro.vercel.app/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}