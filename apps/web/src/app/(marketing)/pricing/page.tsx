'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const plans = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    unit: '/mo',
    description: 'For individuals exploring AI integrations.',
    cta: 'Get started free',
    ctaHref: '/sign-up',
    popular: false,
    features: ['1,000 requests/mo', '1 provider', '1 virtual key', 'Community support'],
  },
  {
    name: 'Pro',
    monthlyPrice: 29,
    yearlyPrice: 23,
    unit: '/mo',
    description: 'For developers shipping AI-powered products.',
    cta: 'Start free trial',
    ctaHref: '/sign-up?plan=pro',
    popular: true,
    features: [
      '50,000 requests/mo',
      'Unlimited providers',
      '10 virtual keys',
      'Email support',
      'Analytics dashboard',
    ],
  },
  {
    name: 'Team',
    monthlyPrice: 49,
    yearlyPrice: 39,
    unit: '/seat/mo',
    description: 'For teams that need collaboration and control.',
    cta: 'Start free trial',
    ctaHref: '/sign-up?plan=team',
    popular: false,
    features: [
      '200,000 requests/mo',
      'Unlimited providers',
      'Unlimited virtual keys',
      'Priority support',
      'SSO',
      'Audit logs',
      'Team management',
    ],
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    yearlyPrice: null,
    unit: '',
    description: 'For organizations with custom requirements.',
    cta: 'Contact sales',
    ctaHref: 'mailto:sales@raven.dev',
    popular: false,
    features: [
      'Unlimited requests',
      'Unlimited providers',
      'Unlimited virtual keys',
      'Dedicated support',
      'SLA',
      'Custom contracts',
      'On-prem option',
    ],
  },
]

const comparisonFeatures = [
  {
    name: 'Monthly requests',
    free: '1,000',
    pro: '50,000',
    team: '200,000',
    enterprise: 'Unlimited',
  },
  { name: 'Providers', free: '1', pro: 'Unlimited', team: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Virtual keys', free: '1', pro: '10', team: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Analytics', free: false, pro: true, team: true, enterprise: true },
  { name: 'Email support', free: false, pro: true, team: true, enterprise: true },
  { name: 'Priority support', free: false, pro: false, team: true, enterprise: true },
  { name: 'Dedicated support', free: false, pro: false, team: false, enterprise: true },
  { name: 'SSO', free: false, pro: false, team: true, enterprise: true },
  { name: 'Audit logs', free: false, pro: false, team: true, enterprise: true },
  { name: 'Team management', free: false, pro: false, team: true, enterprise: true },
  { name: 'SLA', free: false, pro: false, team: false, enterprise: true },
  { name: 'Custom contracts', free: false, pro: false, team: false, enterprise: true },
  { name: 'On-prem deployment', free: false, pro: false, team: false, enterprise: true },
]

export default function PricingPage() {
  const [yearly, setYearly] = useState(false)

  return (
    <div className="px-8 py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Start free and scale as you grow. No hidden fees, no surprises.
          </p>

          <div className="flex items-center justify-center gap-3 mt-8">
            <span
              className={`text-sm font-medium ${!yearly ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setYearly(!yearly)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                yearly ? 'bg-primary' : 'bg-border'
              }`}
            >
              <span
                className={`inline-block size-4 rounded-full bg-white transition-transform ${
                  yearly ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${yearly ? 'text-primary' : 'text-muted-foreground'}`}
            >
              Yearly
              <span className="ml-1.5 text-xs text-success font-medium">Save 20%</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-6 flex flex-col ${
                plan.popular ? 'border-primary shadow-lg' : 'border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                <div className="mt-4">
                  {plan.monthlyPrice !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        ${yearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-sm text-muted-foreground">{plan.unit}</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold">Custom</span>
                    </div>
                  )}
                  {yearly && plan.yearlyPrice !== null && plan.yearlyPrice > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed annually (${plan.yearlyPrice * 12}/yr)
                    </p>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="size-4 text-success shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`block text-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  plan.popular
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'border border-border hover:bg-muted'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-24">
          <h2 className="text-2xl font-bold text-center mb-10">Compare plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Feature</th>
                  <th className="text-center py-3 px-4 font-medium">Free</th>
                  <th className="text-center py-3 px-4 font-medium">Pro</th>
                  <th className="text-center py-3 px-4 font-medium">Team</th>
                  <th className="text-center py-3 px-4 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature) => (
                  <tr key={feature.name} className="border-b border-border">
                    <td className="py-3 pr-4 text-muted-foreground">{feature.name}</td>
                    {(['free', 'pro', 'team', 'enterprise'] as const).map((tier) => {
                      const value = feature[tier]
                      return (
                        <td key={tier} className="text-center py-3 px-4">
                          {typeof value === 'boolean' ? (
                            value ? (
                              <Check className="size-4 text-success mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )
                          ) : (
                            <span>{value}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
