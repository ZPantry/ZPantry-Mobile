export function canManageCatalog(role?: string) {
  return ["super_admin", "admin", "manager"].includes((role || "").toLowerCase());
}
export function canManageUsers(role?: string) {
  return ["super_admin", "admin"].includes((role || "").toLowerCase());
}
