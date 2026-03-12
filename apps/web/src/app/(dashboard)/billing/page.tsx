'use client'

import { Check, CreditCard, Zap } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useEventStream } from '@/hooks/use-event-stream'
import { api } from '@/lib/api'

interface Subscription {
  planId: string
  planName: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

interface PlanFeature {
  text: string
  included: boolean
}

interface Plan {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceYearly: number
  features: PlanFeature[]
  isPopular?: boolean
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600',
  trialing: 'bg-blue-500/10 text-blue-600',
  past_due: 'bg-yellow-500/10 text-yellow-600',
  canceled: 'bg-muted text-muted-foreground',
  incomplete: 'bg-orange-500/10 text-orange-600',
}

type BillingInterval = 'monthly' | 'yearly'
const VALID_INTERVALS: BillingInterval[] = ['monthly', 'yearly']

export default function BillingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const intervalParam = searchParams.get('interval') as BillingInterval | null
  const billingInterval =
    intervalParam && VALID_INTERVALS.includes(intervalParam) ? intervalParam : 'monthly'

  const setBillingInterval = (interval: BillingInterval) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('interval', interval)
    router.replace(`?${params.toString()}`)
  }

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [subData, plansData] = await Promise.all([
        api.get<Subscription | null>('/v1/billing/subscription'),
        api.get<Plan[]>('/v1/billing/plans'),
      ])
      setSubscription(subData)
      setPlans(plansData ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEventStream({
    events: ['subscription.updated'],
    onEvent: () => fetchData(),
    enabled: !loading,
  })

  const handlePlanAction = async (planId: string) => {
    try {
      setUpgrading(planId)
      // UI-only for now — would call upgrade/downgrade API
      await new Promise((resolve) => setTimeout(resolve, 800))
    } finally {
      setUpgrading(null)
    }
  }

  const getPlanButtonLabel = (plan: Plan) => {
    if (!subscription) return 'Get started'
    if (subscription.planId === plan.id) return 'Current plan'
    const currentPlan = plans.find((p) => p.id === subscription.planId)
    if (!currentPlan) return 'Switch plan'
    const currentPrice =
      billingInterval === 'monthly' ? currentPlan.priceMonthly : currentPlan.priceYearly
    const targetPrice = billingInterval === 'monthly' ? plan.priceMonthly : plan.priceYearly
    return targetPrice > currentPrice ? 'Upgrade' : 'Downgrade'
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription and billing details.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <div className="mx-auto size-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">Loading billing...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Current Subscription Card */}
          {subscription && (
            <div className="rounded-xl border border-border">
              <div className="flex items-center gap-3 border-b border-border px-6 py-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <CreditCard className="size-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Current Subscription</h2>
                  <p className="text-xs text-muted-foreground">Your active plan details</p>
                </div>
              </div>
              <div className="px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold">{subscription.planName}</h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_BADGE[subscription.status] ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {subscription.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                      <span className="text-muted-foreground">Period start</span>
                      <span>{new Date(subscription.currentPeriodStart).toLocaleDateString()}</span>
                      <span className="text-muted-foreground">Period end</span>
                      <span>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                    </div>
                    {subscription.cancelAtPeriodEnd && (
                      <p className="text-sm text-yellow-600">
                        Your subscription will cancel at the end of the current period.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Plans Comparison */}
          {plans.length > 0 && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-base font-semibold">Available Plans</h2>
                <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                  <button
                    type="button"
                    onClick={() => setBillingInterval('monthly')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      billingInterval === 'monthly'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingInterval('yearly')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      billingInterval === 'yearly'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Yearly
                    <span className="ml-1.5 rounded-full bg-green-500/10 px-1.5 py-0.5 text-xs text-green-600">
                      Save 20%
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => {
                  const isCurrent = subscription?.planId === plan.id
                  const price = billingInterval === 'monthly' ? plan.priceMonthly : plan.priceYearly
                  const buttonLabel = getPlanButtonLabel(plan)

                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-xl border p-6 ${
                        plan.isPopular
                          ? 'border-primary shadow-sm'
                          : isCurrent
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border'
                      }`}
                    >
                      {plan.isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                            <Zap className="size-3" />
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="mb-4">
                        <h3 className="text-base font-semibold">{plan.name}</h3>
                        {plan.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                        )}
                      </div>

                      <div className="mb-6">
                        <div className="flex items-end gap-1">
                          <span className="text-3xl font-bold">${price}</span>
                          <span className="mb-1 text-sm text-muted-foreground">
                            /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </div>
                        {billingInterval === 'yearly' && plan.priceMonthly > 0 && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            ${(price / 12).toFixed(0)}/mo billed annually
                          </p>
                        )}
                      </div>

                      <ul className="mb-6 space-y-2">
                        {plan.features.map((feature) => (
                          <li
                            key={feature.text}
                            className={`flex items-start gap-2 text-sm ${
                              feature.included
                                ? 'text-foreground'
                                : 'text-muted-foreground line-through'
                            }`}
                          >
                            <Check
                              className={`mt-0.5 size-4 shrink-0 ${feature.included ? 'text-green-500' : 'text-muted-foreground'}`}
                            />
                            {feature.text}
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        onClick={() => !isCurrent && handlePlanAction(plan.id)}
                        disabled={isCurrent || upgrading === plan.id}
                        className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-opacity ${
                          isCurrent
                            ? 'cursor-default bg-muted text-muted-foreground'
                            : plan.isPopular
                              ? 'bg-primary text-primary-foreground hover:opacity-90'
                              : 'border border-border hover:bg-accent'
                        } disabled:opacity-50`}
                      >
                        {upgrading === plan.id ? 'Processing...' : buttonLabel}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!subscription && plans.length === 0 && (
            <div className="rounded-xl border border-border p-12 text-center">
              <CreditCard className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-3 text-muted-foreground">No billing information available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
