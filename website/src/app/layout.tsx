import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Instrument_Serif } from 'next/font/google'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-instrument-serif',
})

export const metadata: Metadata = {
  title: 'Raven - The Open-Source AI Gateway',
  description:
    'One gateway. Every AI provider. Zero telemetry. Route, cache, observe, and govern LLM traffic across 50+ providers.',
  openGraph: {
    title: 'Raven - The Open-Source AI Gateway',
    description:
      'One gateway. Every AI provider. Zero telemetry. Route, cache, observe, and govern LLM traffic across 50+ providers.',
    siteName: 'Raven',
    type: 'website',
    url: 'https://raven.bigint.studio',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Raven - The Open-Source AI Gateway',
    description:
      'One gateway. Every AI provider. Zero telemetry. Route, cache, observe, and govern LLM traffic across 50+ providers.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geist.variable} ${instrumentSerif.variable}`}>
      <body className="min-h-screen bg-background text-foreground font-body antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
