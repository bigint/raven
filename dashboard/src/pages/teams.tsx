import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiClient } from '@/lib/api'
import type { Org, User } from '@/lib/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export default function TeamsPage() {
  const [tab, setTab] = useState('orgs')
  const [createOrgOpen, setCreateOrgOpen] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const queryClient = useQueryClient()

  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => apiClient.listOrgs(),
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.listUsers(),
  })

  const createOrg = useMutation({
    mutationFn: () => apiClient.createOrg({ name: orgName, slug: orgSlug }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgs'] })
      setCreateOrgOpen(false)
      setOrgName('')
      setOrgSlug('')
    },
  })

  const orgColumns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (item: Org) => (
        <span className="text-xs font-medium text-[#fafafa]">{item.name}</span>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (item: Org) => (
        <span className="font-mono text-[11px] text-[#525252]">{item.slug}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (item: Org) => (
        <span className="text-xs text-[#525252] truncate max-w-[200px] inline-block">
          {item.description || '--'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (item: Org) => (
        <span className="text-xs text-[#525252]">
          {format(new Date(item.created_at), 'MMM d, yyyy')}
        </span>
      ),
    },
  ]

  const userColumns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (item: User) => (
        <span className="text-xs font-medium text-[#fafafa]">{item.name}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (item: User) => (
        <span className="text-xs text-[#a3a3a3]">{item.email}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (item: User) => <Badge variant="default">{item.role}</Badge>,
    },
    {
      key: 'teams',
      header: 'Teams',
      render: (item: User) => (
        <span className="font-mono text-xs font-medium text-[#fafafa]">{item.team_ids.length}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (item: User) => (
        <span className="text-xs text-[#525252]">
          {format(new Date(item.created_at), 'MMM d, yyyy')}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[13px] font-semibold text-[#fafafa]">Teams</h1>
        <Button variant="primary" onClick={() => setCreateOrgOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Create Org
        </Button>
      </div>

      <div>
        <TabsList>
          <TabsTrigger value="orgs" activeValue={tab} onSelect={setTab}>
            Organizations
          </TabsTrigger>
          <TabsTrigger value="users" activeValue={tab} onSelect={setTab}>
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orgs" activeValue={tab}>
          <DataTable
            columns={orgColumns}
            data={orgs?.data ?? []}
            total={orgs?.total ?? 0}
            isLoading={orgsLoading}
            emptyTitle="No organizations"
            emptyDescription="Create your first organization to get started."
            getRowKey={(item) => item.id}
          />
        </TabsContent>

        <TabsContent value="users" activeValue={tab}>
          <DataTable
            columns={userColumns}
            data={users?.data ?? []}
            total={users?.total ?? 0}
            isLoading={usersLoading}
            emptyTitle="No users"
            emptyDescription="Users will appear here once created."
            getRowKey={(item) => item.id}
          />
        </TabsContent>
      </div>

      <Dialog open={createOrgOpen} onClose={() => setCreateOrgOpen(false)}>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>Add a new organization to the gateway.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g., Acme Corp"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
          />
          <Input
            label="Slug"
            placeholder="e.g., acme-corp"
            value={orgSlug}
            onChange={(e) => setOrgSlug(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setCreateOrgOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => createOrg.mutate()} disabled={createOrg.isPending}>
            {createOrg.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
