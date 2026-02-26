import { DEFAULT_DISPLAY_TIMEZONE } from "@/lib/constants";

const fallbackFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function getDisplayTimezone(): string {
  return process.env.NEXT_PUBLIC_DISPLAY_TIMEZONE || DEFAULT_DISPLAY_TIMEZONE;
}

export function formatDisplayDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  try {
    const formatter = new Intl.DateTimeFormat("zh-CN", {
      hour12: false,
      timeZone: getDisplayTimezone(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return formatter.format(date).replace(/\//g, "-");
  } catch {
    return fallbackFormatter.format(date).replace(/\//g, "-");
  }
}
