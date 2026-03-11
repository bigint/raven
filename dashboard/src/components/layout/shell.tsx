import type { ReactNode } from 'react'
import { Header } from './header'
import { Sidebar } from './sidebar'

interface ShellProps {
  children: ReactNode
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <div className="lg:ml-[220px]">
        <Header />
        <main className="px-6 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
