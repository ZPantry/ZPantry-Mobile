import { authApi } from "@/api/auth";
import { authStorage } from "@/utils/authStorage";

export async function refreshStoredSession() {
  const refreshToken = await authStorage.getRefreshToken();
  if (!refreshToken) {
    throw new Error("Phiên đăng nhập không còn hiệu lực.");
  }

  const tokens = await authApi.refreshToken(refreshToken);
  await authStorage.updateTokens(tokens);
  return tokens;
}

export async function logoutStoredSession() {
  const accessToken = await authStorage.getAccessToken();

  try {
    await authApi.logout(accessToken || undefined);
  } finally {
    await authStorage.clearSession();
  }
}
