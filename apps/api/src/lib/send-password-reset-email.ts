import { sendPasswordResetEmail as send } from "@raven/email";

export const sendPasswordResetEmail = async (
  user: { email: string },
  resetUrl: string
): Promise<void> => {
  if (!process.env.RESEND_API_KEY) return;

  try {
    await send(user.email, resetUrl);
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }
};
