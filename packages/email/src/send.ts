import { render } from "@react-email/components";
import { Resend } from "resend";
import { BudgetAlertEmail } from "./templates/budget-alert";
import { InvitationEmail } from "./templates/invitation";
import { PasswordResetEmail } from "./templates/password-reset";
import { WelcomeEmail } from "./templates/welcome";

let resend: Resend | null = null;

const getResend = () => {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    resend = new Resend(apiKey);
  }
  return resend;
};

export const sendEmail = async (options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> => {
  const client = getResend();
  await client.emails.send({
    from: "Raven <noreply@raven.dev>",
    html: options.html,
    subject: options.subject,
    to: options.to
  });
};

export const sendWelcomeEmail = async (
  to: string,
  name: string,
  dashboardUrl?: string
): Promise<void> => {
  const html = await render(WelcomeEmail({ dashboardUrl, name }));
  await sendEmail({ html, subject: "Welcome to Raven", to });
};

export const sendInvitationEmail = async (
  to: string,
  inviterName: string,
  orgName: string,
  inviteUrl: string
): Promise<void> => {
  const html = await render(
    InvitationEmail({ inviterName, inviteUrl, orgName })
  );
  await sendEmail({
    html,
    subject: `${inviterName} invited you to ${orgName} on Raven`,
    to
  });
};

export const sendPasswordResetEmail = async (
  to: string,
  resetUrl: string
): Promise<void> => {
  const html = await render(PasswordResetEmail({ resetUrl }));
  await sendEmail({ html, subject: "Reset your Raven password", to });
};

export const sendBudgetAlertEmail = async (
  to: string,
  budgetName: string,
  currentUsage: number,
  limit: number,
  threshold: number
): Promise<void> => {
  const html = await render(
    BudgetAlertEmail({ budgetName, currentUsage, limit, threshold })
  );
  await sendEmail({
    html,
    subject: `Budget alert: ${budgetName} has reached its threshold`,
    to
  });
};
