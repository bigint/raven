import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text
} from "@react-email/components";

interface BudgetAlertEmailProps {
  readonly budgetName: string;
  readonly currentUsage: number;
  readonly limit: number;
  readonly threshold: number;
}

export const BudgetAlertEmail = ({
  budgetName,
  currentUsage,
  limit,
  threshold
}: BudgetAlertEmailProps) => {
  const usagePercent = limit > 0 ? Math.min(Math.round((currentUsage / limit) * 100), 100) : 100;
  const thresholdPercent = Math.round(threshold * 100);

  return (
    <Html>
      <Head />
      <Preview>{`Budget alert: ${budgetName} has reached ${usagePercent}% of its limit`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Budget Alert</Heading>
          <Text style={text}>
            Your budget <strong>{budgetName}</strong> has reached{" "}
            <strong>{usagePercent}%</strong> of its limit, exceeding the{" "}
            {thresholdPercent}% alert threshold.
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
                  <td style={statsValue}>
                    ${Math.max(limit - currentUsage, 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={barContainer}>
            <div style={barTrack}>
              <div
                style={{
                  ...barFill,
                  backgroundColor: usagePercent >= 90 ? "#dc2626" : "#f59e0b",
                  width: `${usagePercent}%`
                }}
              />
            </div>
            <Text style={barLabel}>{usagePercent}% used</Text>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Adjust your budget limits or review usage from the Raven dashboard
            to avoid service interruptions.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const body = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
};

const container = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  margin: "0 auto",
  maxWidth: "480px",
  padding: "40px 24px"
};

const heading = {
  color: "#111827",
  fontSize: "24px",
  fontWeight: "700" as const,
  margin: "0 0 24px",
  textAlign: "center" as const
};

const text = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px"
};

const statsSection = {
  margin: "24px 0"
};

const statsTable = {
  borderCollapse: "collapse" as const,
  width: "100%"
};

const statsLabel = {
  color: "#6b7280",
  fontSize: "14px",
  padding: "8px 0"
};

const statsValue = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "8px 0",
  textAlign: "right" as const
};

const barContainer = {
  margin: "16px 0 24px"
};

const barTrack = {
  backgroundColor: "#e5e7eb",
  borderRadius: "4px",
  height: "8px",
  overflow: "hidden" as const
};

const barFill = {
  borderRadius: "4px",
  height: "8px",
  transition: "width 0.3s ease"
};

const barLabel = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "4px 0 0",
  textAlign: "right" as const
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0"
};

const footer = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0"
};
