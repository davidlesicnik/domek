"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { sendContactMessageEmail } from "@/lib/email";
import { getOptionalEmailConfig } from "@/lib/env";

const contactSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(320),
  message: z.string().trim().min(10, "Message must be at least 10 characters.").max(4000),
  name: z.string().trim().min(1, "Enter your name.").max(120),
});

export type ContactActionState = {
  error: string | null;
  fieldErrors?: Partial<Record<"email" | "message" | "name", string>>;
  success: boolean;
};

export async function sendContactMessageAction(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const parsed = contactSchema.safeParse({
    email: formData.get("email"),
    message: formData.get("message"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;

    return {
      error: "Check the highlighted fields.",
      fieldErrors: {
        email: fieldErrors.email?.[0],
        message: fieldErrors.message?.[0],
        name: fieldErrors.name?.[0],
      },
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
      error: "We couldn't send your message right now. Please try again later.",
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
      error: "We couldn't send your message right now. Please try again later.",
      success: false,
    };
  }

  await prisma.contactMessage.update({
    data: { deliveryError: null, sentAt: new Date() },
    where: { id: message.id },
  });

  return { error: null, success: true };
}
