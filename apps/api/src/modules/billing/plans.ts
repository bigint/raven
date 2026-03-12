import type { Database } from '@raven/db'
import { PLAN_FEATURES } from '@raven/types'
import type { Context } from 'hono'

export const PLAN_DETAILS: Record<
  string,
  {
    name: string
    description: string
    priceMonthly: number
    priceYearly: number
    isPopular?: boolean
  }
> = {
  free: {
    name: 'Free',
    description: 'For individuals and small experiments.',
    priceMonthly: 0,
    priceYearly: 0,
  },
  pro: {
    name: 'Pro',
    description: 'For professionals who need more power.',
    priceMonthly: 29,
    priceYearly: 278,
    isPopular: true,
  },
  team: {
    name: 'Team',
    description: 'For growing teams with advanced needs.',
    priceMonthly: 79,
    priceYearly: 758,
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For organizations that need everything.',
    priceMonthly: 299,
    priceYearly: 2870,
  },
}

export const getPlans = (_db: Database) => async (c: Context) => {
  const plans = Object.entries(PLAN_FEATURES).map(([plan, features]) => {
    const details = PLAN_DETAILS[plan]
    const featureList = [
      {
        text: `${features.maxRequestsPerMonth === Number.POSITIVE_INFINITY ? 'Unlimited' : features.maxRequestsPerMonth.toLocaleString()} requests/month`,
        included: true,
      },
      {
        text: `${features.maxProviders === Number.POSITIVE_INFINITY ? 'Unlimited' : features.maxProviders} providers`,
        included: true,
      },
      {
        text: `${features.maxVirtualKeys === Number.POSITIVE_INFINITY ? 'Unlimited' : features.maxVirtualKeys} virtual keys`,
        included: true,
      },
      {
        text: `${features.maxBudgets === Number.POSITIVE_INFINITY ? 'Unlimited' : features.maxBudgets} budgets`,
        included: true,
      },
      {
        text: `${features.maxSeats === Number.POSITIVE_INFINITY ? 'Unlimited' : features.maxSeats} seats`,
        included: true,
      },
      { text: `${features.analyticsRetentionDays}-day analytics retention`, included: true },
      { text: 'Team management', included: features.hasTeams },
      { text: 'SSO authentication', included: features.hasSSO },
      { text: 'Audit logs', included: features.hasAuditLogs },
      { text: 'Guardrails', included: features.hasGuardrails },
    ]

    return {
      id: plan,
      name: details?.name ?? plan,
      description: details?.description ?? '',
      priceMonthly: details?.priceMonthly ?? 0,
      priceYearly: details?.priceYearly ?? 0,
      isPopular: details?.isPopular ?? false,
      features: featureList,
    }
  })

  return c.json(plans)
}
