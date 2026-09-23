import type { AdminUser, UpdateUserPayload } from "@/api/users";

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
