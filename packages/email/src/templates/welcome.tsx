import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text
} from "@react-email/components";

interface WelcomeEmailProps {
  name: string;
  dashboardUrl?: string;
}

export const WelcomeEmail = ({
  name,
  dashboardUrl = "https://app.raven.dev"
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Raven — your AI gateway is ready</Preview>
    <Body style={body}>
      <Container style={container}>
        <Heading style={heading}>Welcome to Raven</Heading>
        <Text style={text}>Hi {name},</Text>
        <Text style={text}>
          Thanks for joining Raven! Your account is set up and ready to go. You
          can now manage API keys, configure providers, set budgets, and monitor
          usage from your dashboard.
        </Text>
        <Section style={buttonSection}>
          <Button href={dashboardUrl} style={button}>
            Go to Dashboard
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          If you have any questions, reply to this email and we will be happy to
          help.
        </Text>
      </Container>
    </Body>
  </Html>
);

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

const buttonSection = {
  margin: "32px 0",
  textAlign: "center" as const
};

const button = {
  backgroundColor: "#111827",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "600" as const,
  padding: "12px 24px",
  textDecoration: "none"
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
