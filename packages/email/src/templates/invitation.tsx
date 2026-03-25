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
