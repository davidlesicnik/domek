import { z } from "zod";

import { getCurrentAppSession } from "@/lib/authz";
import { prisma } from "@/lib/db";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
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

  const { endpoint, keys } = result.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: session.user.id },
    create: { userId: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

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
