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

interface PasswordResetEmailProps {
  resetUrl: string;
}

export const PasswordResetEmail = ({ resetUrl }: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your Raven password</Preview>
    <Body style={body}>
      <Container style={container}>
        <Heading style={heading}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password. Click the button below
          to choose a new one.
        </Text>
        <Section style={buttonSection}>
          <Button href={resetUrl} style={button}>
            Reset Password
          </Button>
        </Section>
        <Text style={text}>
          This link will expire in 1 hour. If you didn&apos;t request a password
          reset, you can safely ignore this email.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          If the button doesn&apos;t work, copy and paste this URL into your
          browser: {resetUrl}
        </Text>
      </Container>
    </Body>
  </Html>
);
