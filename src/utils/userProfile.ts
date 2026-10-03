import type { AdminUser, UpdateUserPayload } from "@/api/users";

export function formatBirthDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseBirthDate(value: string, today = new Date()): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  // Local noon keeps date-only input independent of UTC conversions.
  const date = new Date(`${value}T12:00:00`);
  if (!Number.isFinite(date.getTime()) || formatBirthDate(date) !== value || value > formatBirthDate(today)) return null;
  return date;
}

// UI guard only. The backend must validate the bearer token and owner identity.
export function canUpdateUser(actorId: string | undefined, targetId: string | undefined) {
  return Boolean(actorId && targetId && actorId.toLowerCase() === targetId.toLowerCase());
}

export function buildUserUpdate(user: Pick<AdminUser, "fullName" | "avatarUrl">, draft: { fullName: string; avatarUrl: string; password: string }): UpdateUserPayload {
  return {
    ...(draft.fullName !== (user.fullName ?? "") ? { fullName: draft.fullName } : {}),
    ...(draft.avatarUrl !== (user.avatarUrl ?? "") ? { avatarUrl: draft.avatarUrl } : {}),
    // Let the server apply its .NET whitespace semantics; never trim passwords.
    ...(draft.password !== "" ? { password: draft.password } : {})
  };
}
