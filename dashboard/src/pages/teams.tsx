import { DataTable } from '@/components/shared/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
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
      render: (item: Org) => <span className="font-medium text-text-dark">{item.name}</span>,
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (item: Org) => (
        <code className="text-xs font-mono text-text-dark-secondary">{item.slug}</code>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (item: Org) => (
        <span className="text-sm text-text-dark-secondary">{item.description || '--'}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (item: Org) => (
        <span className="text-xs text-text-dark-secondary">
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
      render: (item: User) => <span className="font-medium text-text-dark">{item.name}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (item: User) => (
        <span className="text-sm text-text-dark-secondary">{item.email}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (item: User) => (
        <Badge
          variant={item.role === 'admin' ? 'info' : item.role === 'member' ? 'default' : 'warning'}
        >
          {item.role}
        </Badge>
      ),
    },
    {
      key: 'teams',
      header: 'Teams',
      render: (item: User) => <span className="text-sm">{item.team_ids.length}</span>,
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (item: User) => (
        <span className="text-xs text-text-dark-secondary">
          {format(new Date(item.created_at), 'MMM d, yyyy')}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-dark">Teams & Users</h1>
          <p className="text-sm text-text-dark-secondary mt-1">
            Manage organizations, teams, and users
          </p>
        </div>
        <Button onClick={() => setCreateOrgOpen(true)}>
          <Plus className="h-4 w-4" />
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
          <Card>
            <CardContent>
              <DataTable
                columns={orgColumns}
                data={orgs?.data ?? []}
                total={orgs?.total ?? 0}
                isLoading={orgsLoading}
                emptyTitle="No organizations"
                emptyDescription="Create your first organization to get started."
                getRowKey={(item) => item.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" activeValue={tab}>
          <Card>
            <CardContent>
              <DataTable
                columns={userColumns}
                data={users?.data ?? []}
                total={users?.total ?? 0}
                isLoading={usersLoading}
                emptyTitle="No users"
                emptyDescription="Users will appear here once created."
                getRowKey={(item) => item.id}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </div>

      {/* Create org dialog */}
      <Dialog open={createOrgOpen} onClose={() => setCreateOrgOpen(false)}>
        <DialogClose onClose={() => setCreateOrgOpen(false)} />
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
          <Button variant="secondary" onClick={() => setCreateOrgOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => createOrg.mutate()} disabled={createOrg.isPending}>
            {createOrg.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
