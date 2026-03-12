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

interface InvitationEmailProps {
  inviterName: string;
  orgName: string;
  inviteUrl: string;
}

export const InvitationEmail = ({
  inviterName,
  orgName,
  inviteUrl
}: InvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>
      {inviterName} invited you to join {orgName} on Raven
    </Preview>
    <Body style={body}>
      <Container style={container}>
        <Heading style={heading}>You have been invited</Heading>
        <Text style={text}>
          <strong>{inviterName}</strong> has invited you to join{" "}
          <strong>{orgName}</strong> on Raven. Accept the invitation below to
          get started with your team.
        </Text>
        <Section style={buttonSection}>
          <Button href={inviteUrl} style={button}>
            Accept Invitation
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          If you were not expecting this invitation, you can safely ignore this
          email.
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
