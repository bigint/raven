import type { ReactNode } from 'react'
import { Header } from './header'
import { Sidebar } from './sidebar'

interface ShellProps {
  children: ReactNode
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:ml-56">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
