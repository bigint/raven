export const PERMISSIONS = {
  // Agents
  "agents:delete": "Delete agents",
  "agents:read": "View agent identities",
  "agents:write": "Create and manage agents",

  // Analytics
  "analytics:export": "Export analytics data",
  "analytics:view": "View analytics dashboards",

  // Audit logs
  "audit-logs:export": "Export audit logs",
  "audit-logs:view": "View audit logs",

  // Billing
  "billing:manage": "Manage billing and subscriptions",
  "billing:view": "View billing information",

  // Budgets
  "budgets:delete": "Delete budgets",
  "budgets:read": "View budgets",
  "budgets:write": "Create and update budgets",

  // Catalog
  "catalog:approve": "Approve/reject catalog items",
  "catalog:submit": "Submit items to catalog",
  "catalog:view": "View AI catalog",

  // Compliance
  "compliance:manage": "Manage compliance frameworks",
  "compliance:view": "View compliance dashboards",

  // Domains
  "domains:read": "View custom domains",
  "domains:write": "Manage custom domains",

  // Experiments
  "experiments:read": "View experiments",
  "experiments:write": "Create and manage experiments",

  // FinOps
  "finops:export": "Export cost reports",
  "finops:view": "View cost analytics",

  // Guardrails
  "guardrails:delete": "Delete guardrails",
  "guardrails:read": "View guardrail rules",
  "guardrails:write": "Create and update guardrails",

  // Keys
  "keys:create": "Create virtual keys",
  "keys:read": "View virtual keys",
  "keys:revoke": "Revoke virtual keys",

  // MCP
  "mcp:read": "View MCP servers",
  "mcp:write": "Manage MCP servers",

  // Policies
  "policies:delete": "Delete policies",
  "policies:read": "View policies",
  "policies:write": "Create and update policies",

  // Providers
  "providers:delete": "Delete providers",
  "providers:read": "View provider configurations",
  "providers:write": "Create and update providers",

  // Settings
  "settings:read": "View organization settings",
  "settings:write": "Update organization settings",

  // Teams
  "teams:delete": "Delete teams",
  "teams:read": "View teams",
  "teams:write": "Create and manage teams",

  // Webhooks
  "webhooks:delete": "Delete webhooks",
  "webhooks:read": "View webhooks",
  "webhooks:write": "Create and manage webhooks"
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    "agents:delete",
    "agents:read",
    "agents:write",
    "analytics:export",
    "analytics:view",
    "audit-logs:view",
    "budgets:delete",
    "budgets:read",
    "budgets:write",
    "catalog:approve",
    "catalog:submit",
    "catalog:view",
    "compliance:manage",
    "compliance:view",
    "domains:read",
    "domains:write",
    "finops:export",
    "finops:view",
    "guardrails:delete",
    "guardrails:read",
    "guardrails:write",
    "keys:create",
    "keys:read",
    "keys:revoke",
    "mcp:read",
    "mcp:write",
    "policies:delete",
    "policies:read",
    "policies:write",
    "providers:delete",
    "providers:read",
    "providers:write",
    "settings:read",
    "settings:write",
    "teams:delete",
    "teams:read",
    "teams:write",
    "webhooks:delete",
    "webhooks:read",
    "webhooks:write"
  ],

  developer: [
    "agents:read",
    "analytics:view",
    "budgets:read",
    "catalog:submit",
    "catalog:view",
    "experiments:read",
    "finops:view",
    "guardrails:read",
    "keys:read",
    "mcp:read",
    "policies:read",
    "providers:read",
    "teams:read"
  ],

  manager: [
    "agents:read",
    "agents:write",
    "analytics:view",
    "budgets:read",
    "budgets:write",
    "catalog:submit",
    "catalog:view",
    "experiments:read",
    "experiments:write",
    "finops:view",
    "guardrails:read",
    "guardrails:write",
    "keys:create",
    "keys:read",
    "keys:revoke",
    "mcp:read",
    "mcp:write",
    "policies:read",
    "providers:read",
    "providers:write",
    "teams:read",
    "webhooks:read",
    "webhooks:write"
  ],

  owner: Object.keys(PERMISSIONS) as Permission[],

  viewer: [
    "analytics:view",
    "catalog:view",
    "finops:view",
    "providers:read",
    "teams:read"
  ]
};

export const hasPermission = (
  role: string,
  permission: Permission
): boolean => {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
};

export const getPermissions = (role: string): Permission[] => {
  return ROLE_PERMISSIONS[role] ?? [];
};
