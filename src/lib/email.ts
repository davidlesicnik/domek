import nodemailer from "nodemailer";
import { getTranslations } from "next-intl/server";

import { getEmailConfig } from "@/lib/env";

type EmailLocale = "en" | "sl";

type InviteEmailCopy = Readonly<{
  acceptInvite: string;
  inviteBody: string;
  inviteExpiry: string;
  inviteHeading: string;
  inviteSubject: string;
  inviteTextAccept: string;
  inviteTextExpiry: string;
  inviteTextIntro: string;
  someone: string;
}>;

type ResetEmailCopy = Readonly<{
  resetBody: string;
  resetButton: string;
  resetExpiry: string;
  resetHeading: string;
  resetSubject: string;
  resetTextBody: string;
}>;

function normalizeEmailLocale(locale: string | null | undefined): EmailLocale {
  return locale === "sl" ? "sl" : "en";
}

function formatMessage(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

function getTransport() {
  const config = getEmailConfig();

  return {
    from: config.from,
    transport: nodemailer.createTransport({
      auth: config.user ? { pass: config.password, user: config.user } : undefined,
      host: config.host,
      port: config.port,
      secure: config.secure,
    }),
  };
}

export async function sendInviteEmail({
  toEmail,
  inviterName,
  householdName,
  inviteUrl,
  locale,
}: {
  toEmail: string;
  inviterName: string | null;
  householdName: string;
  inviteUrl: string;
  locale?: string | null;
}): Promise<void> {
  const { from, transport } = getTransport();
  const emailLocale = normalizeEmailLocale(locale);
  const t = await getTranslations({ locale: emailLocale, namespace: "emails" });
  const copy: InviteEmailCopy = {
    acceptInvite: t("acceptInvite"),
    inviteBody: t("inviteBody"),
    inviteExpiry: t("inviteExpiry"),
    inviteHeading: t("inviteHeading"),
    inviteSubject: t("inviteSubject"),
    inviteTextAccept: t("inviteTextAccept"),
    inviteTextExpiry: t("inviteTextExpiry"),
    inviteTextIntro: t("inviteTextIntro"),
    someone: t("someone"),
  };
  const sender = inviterName ?? copy.someone;
  const values = { householdName, inviteUrl, sender };

  await transport.sendMail({
    from,
    html: buildInviteHtml({ copy, householdName, inviteUrl, locale: emailLocale, sender }),
    subject: formatMessage(copy.inviteSubject, values),
    text: buildInviteText({ copy, householdName, inviteUrl, sender }),
    to: toEmail,
  });
}

export async function sendPasswordResetEmail({
  locale,
  resetUrl,
  toEmail,
}: {
  locale?: string | null;
  resetUrl: string;
  toEmail: string;
}) {
  const { from, transport } = getTransport();
  const emailLocale = normalizeEmailLocale(locale);
  const t = await getTranslations({ locale: emailLocale, namespace: "emails" });
  const copy: ResetEmailCopy = {
    resetBody: t("resetBody"),
    resetButton: t("resetButton"),
    resetExpiry: t("resetExpiry"),
    resetHeading: t("resetHeading"),
    resetSubject: t("resetSubject"),
    resetTextBody: t("resetTextBody"),
  };
  const values = { resetUrl };

  await transport.sendMail({
    from,
    html: buildResetHtml({ copy, locale: emailLocale, resetUrl }),
    subject: formatMessage(copy.resetSubject, values),
    text: formatMessage(copy.resetTextBody, values),
    to: toEmail,
  });
}

export async function sendContactMessageEmail({
  email,
  message,
  name,
}: {
  email: string;
  message: string;
  name?: string | null;
}): Promise<void> {
  const { from, transport } = getTransport();
  const senderName = name?.trim() || "Someone";

  await transport.sendMail({
    from,
    html: buildContactHtml({ email, message, name: senderName }),
    replyTo: email,
    subject: `New Domek contact message from ${senderName}`,
    text: buildContactText({ email, message, name: senderName }),
    to: "contact@domekapp.com",
  });
}

function buildInviteHtml(opts: {
  copy: InviteEmailCopy;
  householdName: string;
  inviteUrl: string;
  locale: EmailLocale;
  sender: string;
}): string {
  const values = {
    householdName: escapeHtml(opts.householdName),
    inviteUrl: opts.inviteUrl,
    sender: escapeHtml(opts.sender),
  };
  return `<!DOCTYPE html>
<html lang="${opts.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fdfcf8;border:1px solid #dfddd6;border-radius:8px;padding:40px 36px;">
        <tr><td>
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#c85b45;">Domek</p>
          <h1 style="margin:0 0 20px;font-size:22px;font-weight:600;color:#171a18;">${formatMessage(opts.copy.inviteHeading, values)}</h1>
          <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#4d5451;">
            ${formatMessage(opts.copy.inviteBody, values)}
          </p>
          <a href="${opts.inviteUrl}" style="display:inline-block;padding:12px 24px;background:#232323;color:#fdfcf8;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;font-family:Georgia,serif;">${opts.copy.acceptInvite}</a>
          <p style="margin:28px 0 0;font-size:12px;color:#9a9e9b;">${opts.copy.inviteExpiry}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildResetHtml(opts: {
  copy: ResetEmailCopy;
  locale: EmailLocale;
  resetUrl: string;
}) {
  const values = { resetUrl: opts.resetUrl };

  return `<!DOCTYPE html>
<html lang="${opts.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fdfcf8;border:1px solid #dfddd6;border-radius:8px;padding:40px 36px;">
        <tr><td>
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#526c56;">Domek</p>
          <h1 style="margin:0 0 20px;font-size:22px;font-weight:600;color:#171a18;">${opts.copy.resetHeading}</h1>
          <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#4d5451;">
            ${formatMessage(opts.copy.resetBody, values)}
          </p>
          <a href="${opts.resetUrl}" style="display:inline-block;padding:12px 24px;background:#232323;color:#fdfcf8;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;font-family:Georgia,serif;">${opts.copy.resetButton}</a>
          <p style="margin:28px 0 0;font-size:12px;color:#9a9e9b;">${opts.copy.resetExpiry}</p>
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
    "New Domek contact message",
    `Name: ${opts.name}`,
    `Email: ${opts.email}`,
    "Message:",
    opts.message,
  ].join("\n\n");
}

function buildInviteText(opts: {
  copy: InviteEmailCopy;
  householdName: string;
  inviteUrl: string;
  sender: string;
}): string {
  const values = {
    householdName: opts.householdName,
    inviteUrl: opts.inviteUrl,
    sender: opts.sender,
  };
  return [
    formatMessage(opts.copy.inviteTextIntro, values),
    formatMessage(opts.copy.inviteTextAccept, values),
    opts.copy.inviteTextExpiry,
  ].join("\n\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
