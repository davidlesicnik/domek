import {
  deleteShoppingList,
  getCurrentShoppingScope,
  parseShoppingListInput,
  updateShoppingList,
} from "@/lib/shopping-lists";
import { handleRouteError, jsonError } from "@/lib/api-route";
import { revalidateDashboard } from "@/lib/revalidate-dashboard";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const scope = await requireShoppingScope(request);
  if (scope instanceof Response) return scope;

  try {
    const input = parseShoppingListInput(await request.json());
    const { listId } = await params;
    const list = await updateShoppingList(listId, input.name, scope);

    if (!list) {
      return jsonError("Not found.", 404);
    }

    revalidateDashboard();
    return Response.json({ list });
  } catch (error) {
    return handleRouteError(error, {
      invalidMessage: "Invalid shopping list.",
      logLabel: "[PATCH /api/shopping/lists/[listId]]",
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ listId: string }> },
) {
  const scope = await requireShoppingScope(request);
  if (scope instanceof Response) return scope;

  const { listId } = await params;
  const deleted = await deleteShoppingList(listId, scope);

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
