"use client";

import { ListBoard } from "@/components/list-board/list-board";
import type { TodoListView } from "@/lib/todo-lists";

type TodoBoardProps = Readonly<{
  initialLists: TodoListView[];
}>;

export function TodoBoard({ initialLists }: TodoBoardProps) {
  return (
    <ListBoard
      analyticsArea="todo"
      initialLists={initialLists}
      itemsPath="/api/todos/items"
      listsPath="/api/todos/lists"
      title="To-do"
    />
  );
}
