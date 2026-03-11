import type { ReactNode } from 'react'
import { Header } from './header'
import { Sidebar } from './sidebar'

interface ShellProps {
  children: ReactNode
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <Sidebar />
      <div className="lg:ml-60 transition-all duration-300">
        <Header />
        <main className="px-6 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
