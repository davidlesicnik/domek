import { Resend } from "resend";

import { getEmailConfig } from "@/lib/env";

function getResend() {
  const config = getEmailConfig();
  return { resend: new Resend(config.resendApiKey), from: config.fromEmail };
}

export async function sendInviteEmail({
  toEmail,
  inviterName,
  householdName,
  inviteUrl,
}: {
  toEmail: string;
  inviterName: string | null;
  householdName: string;
  inviteUrl: string;
}): Promise<void> {
  const { resend, from } = getResend();
  const sender = inviterName ?? "Someone";

  const { error } = await resend.emails.send({
    from,
    to: toEmail,
    subject: `${sender} invited you to join ${householdName} on Domek`,
    html: buildInviteHtml({ inviterName: sender, householdName, inviteUrl }),
    text: buildInviteText({ inviterName: sender, householdName, inviteUrl }),
  });

  if (error) {
    throw new Error(`Failed to send invite email: ${error.message}`);
  }
}

export async function sendContactMessageEmail({
  email,
  message,
  name,
}: {
  email: string;
  message: string;
  name: string;
}): Promise<void> {
  const { resend, from } = getResend();

  const { error } = await resend.emails.send({
    from,
    to: "contact@domekapp.com",
    replyTo: email,
    subject: `New Domek contact message from ${name}`,
    html: buildContactHtml({ email, message, name }),
    text: buildContactText({ email, message, name }),
  });

  if (error) {
    throw new Error(`Failed to send contact email: ${error.message}`);
  }
}

function buildInviteHtml(opts: {
  inviterName: string;
  householdName: string;
  inviteUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fdfcf8;border:1px solid #dfddd6;border-radius:8px;padding:40px 36px;">
        <tr><td>
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#c85b45;">Domek</p>
          <h1 style="margin:0 0 20px;font-size:22px;font-weight:600;color:#171a18;">You're invited to join ${escapeHtml(opts.householdName)}</h1>
          <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#4d5451;">
            ${escapeHtml(opts.inviterName)} invited you to join <strong>${escapeHtml(opts.householdName)}</strong> on Domek — a shared home board for lists, notes, and everyday money.
          </p>
          <a href="${opts.inviteUrl}" style="display:inline-block;padding:12px 24px;background:#232323;color:#fdfcf8;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;font-family:Georgia,serif;">Accept invite</a>
          <p style="margin:28px 0 0;font-size:12px;color:#9a9e9b;">This link expires in 7 days. If you weren't expecting this, you can safely ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildContactHtml(opts: {
  email: string;
  message: string;
  name: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fdfcf8;border:1px solid #dfddd6;border-radius:8px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#3d6f4a;">Domek contact</p>
          <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:22px;font-weight:600;color:#171a18;">New message from ${escapeHtml(opts.name)}</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4d5451;"><strong>Email:</strong> ${escapeHtml(opts.email)}</p>
          <div style="white-space:pre-wrap;margin:0;font-size:14px;line-height:1.7;color:#202321;">${escapeHtml(opts.message)}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildContactText(opts: {
  email: string;
  message: string;
  name: string;
}): string {
  return [
    `New Domek contact message`,
    `Name: ${opts.name}`,
    `Email: ${opts.email}`,
    `Message:`,
    opts.message,
  ].join("\n\n");
}

function buildInviteText(opts: {
  inviterName: string;
  householdName: string;
  inviteUrl: string;
}): string {
  return [
    `${opts.inviterName} invited you to join "${opts.householdName}" on Domek.`,
    `Accept here: ${opts.inviteUrl}`,
    `This link expires in 7 days. If you weren't expecting this, ignore this email.`,
  ].join("\n\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
