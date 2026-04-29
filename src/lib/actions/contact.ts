"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { sendContactMessageEmail } from "@/lib/email";
import { getOptionalEmailConfig } from "@/lib/env";
import { PUBLIC_MUTATION_COOLDOWN_MS } from "@/lib/public-form";
import { validatePublicServerActionRequest } from "@/lib/public-request-guard";

export type ContactActionState = {
  error: string | null;
  fieldErrors?: Partial<Record<"email" | "message" | "name", string>>;
  success: boolean;
};

export async function sendContactMessageAction(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const t = await getTranslations("contact");
  const contactSchema = z.object({
    email: z
      .string()
      .trim()
      .email(t("formEmailInvalid"))
      .max(320, t("formEmailTooLong")),
    message: z
      .string()
      .trim()
      .min(10, t("formMessageTooShort"))
      .max(4000, t("formMessageTooLong")),
    name: z.string().trim().max(120, t("formNameTooLong")).optional(),
  });
  const parsed = contactSchema.safeParse({
    email: formData.get("email"),
    message: formData.get("message"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;

    return {
      error: t("formValidationError"),
      fieldErrors: {
        email: fieldErrors.email?.[0],
        message: fieldErrors.message?.[0],
        name: fieldErrors.name?.[0],
      },
      success: false,
    };
  }

  const requestGuard = await validatePublicServerActionRequest(formData, "contact", [
    parsed.data.email,
  ]);

  if (!requestGuard.ok) {
    return {
      error:
        requestGuard.reason === "rate_limited"
          ? t("formCooldown", {
              seconds: Math.ceil(PUBLIC_MUTATION_COOLDOWN_MS.contact / 1000),
            })
          : t("formGenericError"),
      success: false,
    };
  }

  const message = await prisma.contactMessage.create({
    data: parsed.data,
    select: { id: true },
  });

  if (!getOptionalEmailConfig()) {
    await prisma.contactMessage.update({
      data: { deliveryError: "Email delivery is not configured." },
      where: { id: message.id },
    });

    return {
      error: t("formGenericError"),
      success: false,
    };
  }

  try {
    await sendContactMessageEmail(parsed.data);
  } catch (error) {
    const deliveryError = error instanceof Error ? error.message : "Unknown email delivery failure.";
    console.error("[sendContactMessageAction] email failed:", error);

    await prisma.contactMessage.update({
      data: { deliveryError },
      where: { id: message.id },
    });

    return {
      error: t("formGenericError"),
      success: false,
    };
  }

  await prisma.contactMessage.update({
    data: { deliveryError: null, sentAt: new Date() },
    where: { id: message.id },
  });

  return { error: null, success: true };
}
