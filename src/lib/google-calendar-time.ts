const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertDateKey(dateKey: string): void {
  if (!DATE_KEY_PATTERN.test(dateKey)) {
    throw new Error(`Invalid dateKey: ${dateKey}`);
  }
}

export function toGoogleAllDayRange(dateKey: string): { endDate: string; startDate: string } {
  assertDateKey(dateKey);

  const [year, month, day] = dateKey.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, month - 1, day));
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  return {
    endDate: endDate.toISOString().slice(0, 10),
    startDate: startDate.toISOString().slice(0, 10),
  };
}

export function toGoogleTimedDateTime(
  dateKey: string,
  time: string,
  timeZone = "UTC",
): { dateTime: string; timeZone: string } {
  assertDateKey(dateKey);

  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Invalid time: ${time}`);
  }

  const date = new Date(`${dateKey}T${time}:00.000Z`);

  return {
    dateTime: date.toISOString(),
    timeZone,
  };
}
