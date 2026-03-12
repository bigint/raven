import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Changelog - Raven',
  description: 'What is new in Raven.',
}

const ChangelogPage = () => {
  return (
    <div className="min-h-screen pt-32 pb-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-heading text-5xl md:text-6xl text-foreground">Changelog</h1>
          <p className="mt-6 text-lg text-muted">
            Coming soon. Star the{' '}
            <a
              href="https://github.com/bigint-studio/raven"
              className="text-primary-light hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              repository
            </a>{' '}
            to get notified of new releases.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ChangelogPage
