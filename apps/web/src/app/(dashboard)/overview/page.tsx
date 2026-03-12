'use client'

import { useSession } from '@/lib/auth-client'

export default function OverviewPage() {
  const { data: session } = useSession()

  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>
      <p className="mt-2 text-gray-600">
        Welcome{session?.user?.name ? `, ${session.user.name}` : ''}
      </p>
    </div>
  )
}
