import { authApi } from "@/api/auth";
import { authStorage } from "@/utils/authStorage";
import { refreshAccessToken } from "@/api/client";

export async function refreshStoredSession() {
  await refreshAccessToken();
  return authStorage.getSession();
}

export async function logoutStoredSession() {
  const accessToken = await authStorage.getAccessToken();
  await authStorage.clearSession();
  if (accessToken) await authApi.logout(accessToken);
}
