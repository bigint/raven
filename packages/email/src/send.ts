import { render } from "@react-email/components";
import { Resend } from "resend";
import { BudgetAlertEmail } from "./templates/budget-alert";
import { InvitationEmail } from "./templates/invitation";
import { PasswordResetEmail } from "./templates/password-reset";
import { WelcomeEmail } from "./templates/welcome";

export interface EmailConfig {
  apiKey: string;
  fromEmail?: string;
}

let cachedClient: { apiKey: string; client: Resend } | null = null;

const getResend = (apiKey: string): Resend => {
  if (!cachedClient || cachedClient.apiKey !== apiKey) {
    cachedClient = { apiKey, client: new Resend(apiKey) };
  }
  return cachedClient.client;
};

export const sendEmail = async (
  config: EmailConfig,
  options: {
    to: string;
    subject: string;
    html: string;
  }
): Promise<void> => {
  const client = getResend(config.apiKey);
  await client.emails.send({
    from: config.fromEmail || "Raven <noreply@raven.dev>",
    html: options.html,
    subject: options.subject,
    to: options.to
  });
};

export const sendWelcomeEmail = async (
  config: EmailConfig,
  to: string,
  name: string,
  dashboardUrl?: string
): Promise<void> => {
  const html = await render(WelcomeEmail({ dashboardUrl, name }));
  await sendEmail(config, { html, subject: "Welcome to Raven", to });
};

export const sendInvitationEmail = async (
  config: EmailConfig,
  to: string,
  inviterName: string,
  orgName: string,
  inviteUrl: string
): Promise<void> => {
  const html = await render(
    InvitationEmail({ inviterName, inviteUrl, orgName })
  );
  await sendEmail(config, {
    html,
    subject: `${inviterName} invited you to ${orgName} on Raven`,
    to
  });
};

export const sendPasswordResetEmail = async (
  config: EmailConfig,
  to: string,
  resetUrl: string
): Promise<void> => {
  const html = await render(PasswordResetEmail({ resetUrl }));
  await sendEmail(config, { html, subject: "Reset your Raven password", to });
};

export const sendBudgetAlertEmail = async (
  config: EmailConfig,
  to: string,
  budgetName: string,
  currentUsage: number,
  limit: number,
  threshold: number
): Promise<void> => {
  const html = await render(
    BudgetAlertEmail({ budgetName, currentUsage, limit, threshold })
  );
  await sendEmail(config, {
    html,
    subject: `Budget alert: ${budgetName} has reached its threshold`,
    to
  });
};
