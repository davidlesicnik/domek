import { deleteShoppingItem, getCurrentShoppingScope, toggleShoppingItem } from "@/lib/shopping-lists";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const scope = await getCurrentShoppingScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  const item = await toggleShoppingItem(itemId, scope);

  if (!item) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  return Response.json({ item });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const scope = await getCurrentShoppingScope();

  if (!scope) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  const deleted = await deleteShoppingItem(itemId, scope);

  if (!deleted) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
