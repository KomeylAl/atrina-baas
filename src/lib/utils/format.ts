/**
 * Convert digits to Persian numerals and format numbers with thousand separators.
 */
const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(s: string | number): string {
  return String(s).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function formatNumber(n: number): string {
  return toPersianDigits(n.toLocaleString("en-US"));
}

export function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tehran",
    }).format(date);
  } catch {
    return toPersianDigits(date.toISOString());
  }
}

export function formatDateShort(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "Asia/Tehran",
    }).format(date);
  } catch {
    return toPersianDigits(date.toISOString().slice(0, 10));
  }
}

export function timeAgo(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "همین حالا";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${toPersianDigits(min)} دقیقه پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${toPersianDigits(hr)} ساعت پیش`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${toPersianDigits(day)} روز پیش`;
  return formatDateShort(date);
}
