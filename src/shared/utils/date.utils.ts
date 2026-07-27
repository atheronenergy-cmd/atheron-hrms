import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

export function formatDate(date: Date | string | null | undefined, pattern = "dd MMM yyyy"): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return format(d, pattern);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, "dd MMM yyyy HH:mm");
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
