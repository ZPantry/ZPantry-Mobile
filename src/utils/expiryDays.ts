import { formatBirthDate } from './userProfile';

export function expiryDateFromDays(value: string, today = new Date()): string | null {
  if (!value.trim()) return null;
  if (!/^\d+$/.test(value.trim()) || Number(value) > 36500) {
    throw new Error('Hạn dùng phải là số ngày nguyên từ 0 đến 36500.');
  }
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  date.setDate(date.getDate() + Number(value));
  return formatBirthDate(date);
}

/** Compare calendar dates, avoiding daylight-saving and partial-day rounding. */
export function remainingExpiryDays(value: string | null | undefined, today = new Date()): string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const current = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return String(Math.round((target - current) / 86400000));
}
