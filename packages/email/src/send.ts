import { Resend } from "resend";

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
