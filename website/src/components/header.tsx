'use client'

import { cn } from '@/lib/utils'
import { Github, Star } from 'lucide-react'
import { useEffect, useState } from 'react'

const navLinks = [
  { label: 'Docs', href: '/docs' },
  { label: 'Blog', href: '/blog' },
  { label: 'GitHub', href: 'https://github.com/bigint-studio/raven' },
  { label: 'Changelog', href: '/changelog' },
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border'
          : 'bg-transparent',
      )}
    >
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <span className="font-heading text-2xl text-foreground">Raven</span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-muted hover:text-foreground transition-colors duration-200"
              {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href="https://github.com/bigint-studio/raven"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors duration-200"
        >
          <Github className="h-4 w-4" />
          <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
          <span className="text-muted">Star</span>
        </a>
      </div>
    </header>
  )
}
