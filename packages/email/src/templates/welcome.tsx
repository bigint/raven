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

import {
  body,
  button,
  buttonSection,
  container,
  footer,
  heading,
  hr,
  text
} from "../styles";

interface WelcomeEmailProps {
  name: string;
  dashboardUrl?: string;
}

export const WelcomeEmail = ({
  name,
  dashboardUrl = "https://app.yoginth.com"
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
