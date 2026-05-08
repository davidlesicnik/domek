import { prisma } from "@/lib/db";
import { refreshTokenIfNeeded } from "@/lib/google-calendar-auth";
import { toGoogleAllDayRange, toGoogleTimedDateTime } from "@/lib/google-calendar-time";

const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const DEFAULT_CALENDAR_ID = "primary";
const SYNC_STATUS_ERROR = "error";
const SYNC_STATUS_SYNCED = "synced";

type SyncSummary = Readonly<{
  created: number;
  deleted: number;
  errored: number;
  updated: number;
}>;

type GoogleDateTime = Readonly<{
  dateTime: string;
  timeZone: string;
}>;

type GoogleDate = Readonly<{
  date: string;
}>;

type GoogleCalendarEventBody = Readonly<{
  description?: string;
  end: GoogleDate | GoogleDateTime;
  start: GoogleDate | GoogleDateTime;
  summary: string;
}>;

function createGoogleCalendarEventBody(event: {
  allDay: boolean;
  dateKey: string;
  name: string;
  time: string | null;
}): GoogleCalendarEventBody {
  if (event.allDay) {
    const { endDate, startDate } = toGoogleAllDayRange(event.dateKey);

    return {
      end: { date: endDate },
      start: { date: startDate },
      summary: event.name,
    };
  }

  const startTime = event.time ?? "00:00";
  const start = toGoogleTimedDateTime(event.dateKey, startTime);

  const endDate = new Date(start.dateTime);
  endDate.setUTCHours(endDate.getUTCHours() + 1);

  return {
    end: {
      dateTime: endDate.toISOString(),
      timeZone: start.timeZone,
    },
    start,
    summary: event.name,
  };
}

async function sendGoogleCalendarRequest<T>(
  accessToken: string,
  path: string,
  init: Omit<RequestInit, "headers">,
): Promise<T> {
  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Google Calendar API request failed (${response.status}): ${responseText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function deleteGoogleCalendarEvent(accessToken: string, googleEventId: string): Promise<void> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(DEFAULT_CALENDAR_ID)}/events/${encodeURIComponent(googleEventId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "DELETE",
    },
  );

  if (response.ok || response.status === 404) {
    return;
  }

  const responseText = await response.text();
  throw new Error(`Google Calendar delete failed (${response.status}): ${responseText}`);
}

export async function syncCalendarEventsToGoogle(householdId: string): Promise<SyncSummary> {
  const accessToken = await refreshTokenIfNeeded(householdId);

  if (!accessToken) {
    throw new Error("Google Calendar is not connected for this household.");
  }

  const [activeEvents, deletedEvents] = await Promise.all([
    prisma.calendarEvent.findMany({
      select: {
        allDay: true,
        dateKey: true,
        googleEventId: true,
        id: true,
        name: true,
        time: true,
      },
      where: {
        deletedAt: null,
        householdId,
      },
    }),
    prisma.calendarEvent.findMany({
      select: {
        googleEventId: true,
        id: true,
      },
      where: {
        deletedAt: { not: null },
        googleEventId: { not: null },
        householdId,
      },
    }),
  ]);

  const summary = {
    created: 0,
    deleted: 0,
    errored: 0,
    updated: 0,
  };

  for (const event of activeEvents) {
    const eventBody = createGoogleCalendarEventBody(event);

    try {
      if (event.googleEventId) {
        await sendGoogleCalendarRequest(
          accessToken,
          `/calendars/${encodeURIComponent(DEFAULT_CALENDAR_ID)}/events/${encodeURIComponent(event.googleEventId)}`,
          {
            body: JSON.stringify(eventBody),
            method: "PATCH",
          },
        );

        await prisma.calendarEvent.update({
          data: {
            lastSyncedAt: new Date(),
            syncStatus: SYNC_STATUS_SYNCED,
          },
          where: { id: event.id },
        });

        summary.updated += 1;
      } else {
        const createdEvent = await sendGoogleCalendarRequest<{ id: string }>(
          accessToken,
          `/calendars/${encodeURIComponent(DEFAULT_CALENDAR_ID)}/events`,
          {
            body: JSON.stringify(eventBody),
            method: "POST",
          },
        );
        if (!createdEvent.id) {
          throw new Error("Google Calendar did not return event id.");
        }

        await prisma.calendarEvent.update({
          data: {
            googleEventId: createdEvent.id,
            lastSyncedAt: new Date(),
            syncStatus: SYNC_STATUS_SYNCED,
          },
          where: { id: event.id },
        });

        summary.created += 1;
      }
    } catch (error) {
      await prisma.calendarEvent.update({
        data: { syncStatus: SYNC_STATUS_ERROR },
        where: { id: event.id },
      });

      summary.errored += 1;
      console.error(`[google-calendar-sync] Failed to sync event ${event.id}`, error);
    }
  }

  for (const event of deletedEvents) {
    if (!event.googleEventId) {
      continue;
    }

    try {
      await deleteGoogleCalendarEvent(accessToken, event.googleEventId);

      await prisma.calendarEvent.update({
        data: {
          googleEventId: null,
          lastSyncedAt: new Date(),
          syncStatus: SYNC_STATUS_SYNCED,
        },
        where: { id: event.id },
      });

      summary.deleted += 1;
    } catch (error) {
      await prisma.calendarEvent.update({
        data: { syncStatus: SYNC_STATUS_ERROR },
        where: { id: event.id },
      });

      summary.errored += 1;
      console.error(`[google-calendar-sync] Failed to delete Google event for ${event.id}`, error);
    }
  }

  return summary;
}
