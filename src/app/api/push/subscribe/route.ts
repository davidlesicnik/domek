import { z } from "zod";

import { getCurrentAppSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  locale: z.enum(["en", "sl"]).optional(),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(256),
  }),
});

export async function POST(request: Request) {
  const session = await getCurrentAppSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = subscriptionSchema.safeParse(body);
  if (!result.success) {
    return Response.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const { endpoint, keys, locale } = result.data;
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint },
    select: { id: true, userId: true },
  });

  if (existing && existing.userId !== session.user.id) {
    return Response.json({ error: "Subscription endpoint already belongs to another user" }, { status: 409 });
  }

  if (existing) {
    await prisma.pushSubscription.update({
      where: { id: existing.id },
      data: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        ...(locale ? { locale } : {}),
      },
    });
  } else {
    await prisma.pushSubscription.create({
      data: {
        userId: session.user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        locale: locale ?? "en",
      },
    });
  }

  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getCurrentAppSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = z.object({ endpoint: z.string().url().max(2048) }).safeParse(body);
  if (!result.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: result.data.endpoint, userId: session.user.id },
  });

  return Response.json({ ok: true });
}
