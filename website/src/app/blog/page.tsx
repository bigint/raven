import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog - Raven',
  description: 'Updates and articles from the Raven team.',
}

const BlogPage = () => {
  return (
    <div className="min-h-screen pt-32 pb-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-heading text-5xl md:text-6xl text-foreground">Blog</h1>
          <p className="mt-6 text-lg text-muted">
            Coming soon. Follow us on{' '}
            <a
              href="https://github.com/bigint-studio/raven"
              className="text-primary-light hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>{' '}
            for the latest updates.
          </p>
        </div>
      </div>
    </div>
  )
}

export default BlogPage
