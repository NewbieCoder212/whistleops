import { Resend } from "resend";
import { env, isResendConfigured, resendFromEmail } from "../env";

let client: Resend | null = null;

function getResend(): Resend {
  if (!isResendConfigured()) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!client) client = new Resend(env.RESEND_API_KEY!);
  return client;
}

function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:sans-serif;line-height:1.5;white-space:pre-wrap">${escaped}</div>`;
}

export type EmailRecipient = {
  email: string;
  full_name: string | null;
};

export async function sendBulkEmail(
  recipients: EmailRecipient[],
  subject: string,
  body: string
): Promise<{ sent: string[]; failed: Array<{ email: string; error: string }> }> {
  const resend = getResend();
  const from = resendFromEmail();
  const html = plainTextToHtml(body);

  const sent: string[] = [];
  const failed: Array<{ email: string; error: string }> = [];

  for (const recipient of recipients) {
    const { error } = await resend.emails.send({
      from,
      to: recipient.email,
      subject,
      text: body,
      html,
    });
    if (error) {
      failed.push({ email: recipient.email, error: error.message });
    } else {
      sent.push(recipient.email);
    }
  }

  return { sent, failed };
}
