export function canManageCatalog(role?: string) {
  return ["super_admin", "admin"].includes((role || "").toLowerCase());
}
export function canManageUsers(role?: string) {
  return ["super_admin", "admin"].includes((role || "").toLowerCase());
}
export function assignableRoles(actorRole?: string, targetRole?: string) {
  const actor = (actorRole || "").toUpperCase();
  const target = (targetRole || "").toUpperCase();
  if (actor === "SUPER_ADMIN") return ["USER", "MANAGER", "ADMIN", "SUPER_ADMIN"];
  if (actor === "ADMIN" && ["USER", "MANAGER"].includes(target)) return ["USER", "MANAGER"];
  return [];
}
