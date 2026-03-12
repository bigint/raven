import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation - Raven',
  description: 'Raven AI Gateway documentation and guides.',
}

const DocsPage = () => {
  return (
    <div className="min-h-screen pt-32 pb-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-heading text-5xl md:text-6xl text-foreground">Documentation</h1>
          <p className="mt-6 text-lg text-muted">
            Documentation coming soon. In the meantime, check out the{' '}
            <a
              href="https://github.com/bigint-studio/raven"
              className="text-primary-light hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub repository
            </a>{' '}
            for setup instructions.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DocsPage
