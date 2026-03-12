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
  Text,
} from '@react-email/components'

interface InvitationEmailProps {
  inviterName: string
  orgName: string
  inviteUrl: string
}

export const InvitationEmail = ({ inviterName, orgName, inviteUrl }: InvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>
      {inviterName} invited you to join {orgName} on Raven
    </Preview>
    <Body style={body}>
      <Container style={container}>
        <Heading style={heading}>You have been invited</Heading>
        <Text style={text}>
          <strong>{inviterName}</strong> has invited you to join <strong>{orgName}</strong> on
          Raven. Accept the invitation below to get started with your team.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={inviteUrl}>
            Accept Invitation
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          If you were not expecting this invitation, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

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

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#111827',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  padding: '12px 24px',
  display: 'inline-block',
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
