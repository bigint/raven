import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface BudgetAlertEmailProps {
  budgetName: string
  currentUsage: number
  limit: number
  threshold: number
}

export const BudgetAlertEmail = ({
  budgetName,
  currentUsage,
  limit,
  threshold,
}: BudgetAlertEmailProps) => {
  const usagePercent = Math.min(Math.round((currentUsage / limit) * 100), 100)
  const thresholdPercent = Math.round(threshold * 100)

  return (
    <Html>
      <Head />
      <Preview>
        Budget alert: {budgetName} has reached {usagePercent}% of its limit
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Budget Alert</Heading>
          <Text style={text}>
            Your budget <strong>{budgetName}</strong> has reached <strong>{usagePercent}%</strong>{' '}
            of its limit, exceeding the {thresholdPercent}% alert threshold.
          </Text>

          <Section style={statsSection}>
            <table style={statsTable}>
              <tbody>
                <tr>
                  <td style={statsLabel}>Current Usage</td>
                  <td style={statsValue}>${currentUsage.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={statsLabel}>Budget Limit</td>
                  <td style={statsValue}>${limit.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={statsLabel}>Remaining</td>
                  <td style={statsValue}>${Math.max(limit - currentUsage, 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={barContainer}>
            <div style={barTrack}>
              <div
                style={{
                  ...barFill,
                  width: `${usagePercent}%`,
                  backgroundColor: usagePercent >= 90 ? '#dc2626' : '#f59e0b',
                }}
              />
            </div>
            <Text style={barLabel}>{usagePercent}% used</Text>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Adjust your budget limits or review usage from the Raven dashboard to avoid service
            interruptions.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 24px',
  borderRadius: '8px',
  maxWidth: '480px',
}

const heading = {
  fontSize: '24px',
  fontWeight: '700' as const,
  color: '#111827',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}

const text = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#374151',
  margin: '0 0 16px',
}

const statsSection = {
  margin: '24px 0',
}

const statsTable = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const statsLabel = {
  fontSize: '14px',
  color: '#6b7280',
  padding: '8px 0',
}

const statsValue = {
  fontSize: '14px',
  fontWeight: '600' as const,
  color: '#111827',
  textAlign: 'right' as const,
  padding: '8px 0',
}

const barContainer = {
  margin: '16px 0 24px',
}

const barTrack = {
  backgroundColor: '#e5e7eb',
  borderRadius: '4px',
  height: '8px',
  overflow: 'hidden' as const,
}

const barFill = {
  height: '8px',
  borderRadius: '4px',
  transition: 'width 0.3s ease',
}

const barLabel = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '4px 0 0',
  textAlign: 'right' as const,
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
}

const footer = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#6b7280',
  margin: '0',
}
