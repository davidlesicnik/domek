import type { Metadata } from "next";

import { CalendarBoard } from "@/components/calendar/calendar-board";
import { listCalendarEvents } from "@/lib/calendar-events";

export const metadata: Metadata = {
  title: "Calendar | Domek",
  description: "A shared household calendar for Domek.",
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default async function CalendarPage() {
  const initialEvents = await listCalendarEvents();

  return <CalendarBoard initialEvents={initialEvents} todayKey={todayKey()} />;
}
