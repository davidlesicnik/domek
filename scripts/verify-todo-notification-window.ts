import { getEndOfToday } from "../src/lib/notifications/todo-window";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const now = new Date("2026-05-07T10:00:00.000Z");
const endOfToday = getEndOfToday(now);

const overdue = new Date("2026-05-06T23:00:00.000Z");
const dueToday = new Date("2026-05-07T18:00:00.000Z");
const dueTomorrow = new Date("2026-05-08T08:00:00.000Z");

assert(overdue <= endOfToday, "Overdue todos should be included.");
assert(dueToday <= endOfToday, "Today todos should be included.");
assert(!(dueTomorrow <= endOfToday), "Tomorrow todos should be excluded.");

console.log("Todo notification window check passed.");
