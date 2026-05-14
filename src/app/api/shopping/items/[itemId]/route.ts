import {
  deleteShoppingItem,
  getCurrentShoppingScope,
  parseShoppingItemInput,
  toggleShoppingItem,
  updateShoppingItem,
} from "@/lib/shopping-lists";
import { handleRouteError, jsonError } from "@/lib/api-route";
import { revalidateDashboard } from "@/lib/revalidate-dashboard";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const scope = await requireShoppingScope(request);
  if (scope instanceof Response) return scope;
  const { itemId } = await params;

  try {
    const rawBody = await request.text();

    if (!rawBody.trim()) {
      const item = await toggleShoppingItem(itemId, scope);

      if (!item) {
        return jsonError("Not found.", 404);
      }

      revalidateDashboard();
      return Response.json({ item });
    }

    const input = parseShoppingItemInput(JSON.parse(rawBody));
    const item = await updateShoppingItem(itemId, input.text, scope);

    if (!item) {
      return jsonError("Not found.", 404);
    }

    revalidateDashboard();
    return Response.json({ item });
  } catch (error) {
    return handleRouteError(error, {
      invalidMessage: "Invalid shopping item.",
      logLabel: "[PATCH /api/shopping/items/[itemId]]",
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const scope = await requireShoppingScope(request);
  if (scope instanceof Response) return scope;

  const { itemId } = await params;
  const deleted = await deleteShoppingItem(itemId, scope);

  if (!deleted) {
    return jsonError("Not found.", 404);
  }

  revalidateDashboard();
  return Response.json({ ok: true });
}

async function requireShoppingScope(request: Request) {
  const scope = await getCurrentShoppingScope(request);
  return scope ?? jsonError("Unauthorized", 401);
}
