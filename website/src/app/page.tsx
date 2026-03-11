import { Architecture } from '@/components/architecture'
import { CodeExample } from '@/components/code-example'
import { Comparison } from '@/components/comparison'
import { Features } from '@/components/features'
import { Hero } from '@/components/hero'
import { ProvidersGrid } from '@/components/providers-grid'

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <ProvidersGrid />
      <Architecture />
      <Comparison />
      <CodeExample />
    </>
  )
}
