export function parseTimeToHoursMinutes(
  timeValue: string
): { hours: number; minutes: number } | null {
  const raw = (timeValue || '').trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();

  // 12-hour format: "9:30 AM", "11 AM"
  const ampmMatch = upper.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*$/);
  if (ampmMatch) {
    let hours = Number(ampmMatch[1]);
    const minutes = Number(ampmMatch[2] || '0');
    const meridiem = ampmMatch[3];

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;

    if (meridiem === 'AM') {
      if (hours === 12) hours = 0;
    } else {
      if (hours !== 12) hours += 12;
    }

    return { hours, minutes };
  }

  // 24-hour format: "09:30", "9:30"
  const hmMatch = raw.match(/^\s*(\d{1,2}):(\d{2})\s*$/);
  if (hmMatch) {
    const hours = Number(hmMatch[1]);
    const minutes = Number(hmMatch[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return { hours, minutes };
  }

  return null;
}

export function formatTimeHHmm(input: { hours: number; minutes: number }): string {
  const hh = String(input.hours).padStart(2, '0');
  const mm = String(input.minutes).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function normalizeTimeToHHmm(timeValue: string): string | null {
  const parsed = parseTimeToHoursMinutes(timeValue);
  if (!parsed) return null;
  return formatTimeHHmm(parsed);
}

export function formatTime12h(timeHHmmOr12h: string): string {
  const parsed = parseTimeToHoursMinutes(timeHHmmOr12h);
  if (!parsed) return String(timeHHmmOr12h || '').trim();

  const hours24 = parsed.hours;
  const minutes = parsed.minutes;

  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  const mm = String(minutes).padStart(2, '0');
  return `${hours12}:${mm} ${meridiem}`;
}

export function buildAppointmentDateTime(dateValue: string, timeValue: string): Date {
  // dateValue is expected to be YYYY-MM-DD from the client.
  const base = new Date(`${dateValue}T00:00:00`);
  const parsed = parseTimeToHoursMinutes(timeValue);
  if (!parsed) return base;
  base.setHours(parsed.hours, parsed.minutes, 0, 0);
  return base;
}
