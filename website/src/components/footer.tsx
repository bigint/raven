import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/#pricing' },
    { label: 'Changelog', href: '/changelog' },
  ],
  Developers: [
    { label: 'Docs', href: '/docs' },
    { label: 'API Reference', href: '/docs' },
    { label: 'SDKs', href: '/docs' },
    { label: 'GitHub', href: 'https://github.com/bigint-studio/raven' },
  ],
  Community: [
    { label: 'Discord', href: '#' },
    { label: 'Twitter', href: '#' },
    { label: 'Blog', href: '/blog' },
  ],
  Legal: [
    { label: 'License', href: 'https://github.com/bigint-studio/raven/blob/main/LICENSE' },
    { label: 'Privacy', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border">
      {/* CTA */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-4xl md:text-6xl text-foreground">
              Ready to take control?
            </h2>
            <p className="mt-6 text-lg text-muted">
              Deploy Raven in minutes. Open source, self-hosted, zero telemetry.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button href="/docs" variant="primary">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="https://github.com/bigint-studio/raven" variant="secondary">
                View Source
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Links */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 md:col-span-1">
              <span className="font-heading text-2xl text-foreground">Raven</span>
              <p className="mt-3 text-sm text-muted leading-relaxed">
                The open-source AI gateway.
              </p>
            </div>

            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-sm font-semibold text-foreground mb-4">{title}</h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-muted hover:text-foreground transition-colors duration-200"
                        {...(link.href.startsWith('http')
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted">
              Built by{' '}
              <a
                href="https://raven.bigint.studio"
                className="text-foreground hover:text-primary-light transition-colors"
              >
                Bigint Studio
              </a>
            </p>
            <p className="text-sm text-muted">Apache 2.0 License</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
