import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Raven - AI Gateway',
  description: 'Unified AI gateway for teams',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.className} min-h-screen bg-white text-neutral-900 antialiased`}>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
