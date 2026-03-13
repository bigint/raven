import { sendWelcomeEmail as send } from "@raven/email";

export const sendWelcomeEmail = async (
  user: { name: string; email: string },
  appUrl: string
): Promise<void> => {
  if (!process.env.RESEND_API_KEY) return;

  try {
    await send(user.email, user.name, appUrl);
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }
};
