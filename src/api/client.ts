import { resolveApiBaseUrl } from "@/api/baseUrl";
import { ApiError, getMessage, unwrapEnvelope } from "@/api/response";
export { ApiError } from "@/api/response";
export type { ApiMessageResponse, PaginatedResponse } from "@/api/response";
import { authStorage } from "@/utils/authStorage";
import { Platform } from "react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const ANDROID_API_BASE_URL = process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL;

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
  timeoutMs?: number;
  skipAuthRefresh?: boolean;
};

let refreshFlight: { revision: number; promise: Promise<string> } | null = null;

export async function refreshAccessToken(): Promise<string> {
  const revision = authStorage.getRevision();
  if (refreshFlight?.revision === revision) return refreshFlight.promise;
  const promise = (async () => {
    const refreshToken = await authStorage.getRefreshToken();
    if (!refreshToken) {
      if (authStorage.getRevision() === revision) await authStorage.clearSession();
      throw new ApiError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", 401);
    }
    try {
      const tokens = await apiRequest<{ accessToken: string; refreshToken: string; expiresAt: string }>("/api/Auth/refresh-token", {
        method: "POST", body: JSON.stringify({ refreshToken }), skipAuthRefresh: true
      });
      if (!tokens.accessToken || !tokens.refreshToken) throw new ApiError("Phiên đăng nhập không hợp lệ.", 401);
      if (!await authStorage.updateTokens(tokens, revision)) throw new ApiError("Phiên đăng nhập đã thay đổi.", 401);
      return tokens.accessToken;
    } catch (error) {
      if (error instanceof ApiError && [400, 401, 403].includes(error.status) && authStorage.getRevision() === revision)
        await authStorage.clearSession();
      throw error;
    }
  })();
  refreshFlight = { revision, promise };
  try { return await promise; } finally { if (refreshFlight?.promise === promise) refreshFlight = null; }
}

export async function restoreSession() {
  const session = await authStorage.getSession();
  if (session && (!session.user.expiresAt || Date.parse(session.user.expiresAt) <= Date.now() + 30000)) {
    try { await refreshAccessToken(); } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 0) return authStorage.getSession();
      // Keep credentials during a network outage; requests can retry when connected.
    }
    return authStorage.getSession();
  }
  return session;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = false, headers, timeoutMs = 30000, skipAuthRefresh = false, ...fetchOptions } = options;
  const sessionRevision = authStorage.getRevision();
  const token = auth ? await authStorage.getAccessToken() : null;
  const url = `${resolveApiBaseUrl(API_BASE_URL, ANDROID_API_BASE_URL, Platform.OS)}${path}`;
  const requestBody = fetchOptions.body;
  const isFormData = typeof FormData !== "undefined" && requestBody instanceof FormData;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  const abortRequest = () => timeoutController.abort();
  if (fetchOptions.signal?.aborted) abortRequest();
  else fetchOptions.signal?.addEventListener("abort", abortRequest, { once: true });

  const requestHeaders = new Headers(headers);
  if (!isFormData && !requestHeaders.has("Content-Type")) requestHeaders.set("Content-Type", "application/json");
  if (token && !requestHeaders.has("Authorization")) requestHeaders.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal: timeoutController.signal,
      headers: requestHeaders
    });
    const body = await readResponse(response);
    if (response.status === 401 && auth && !skipAuthRefresh && !new Headers(headers).has("Authorization")) {
      if (sessionRevision !== authStorage.getRevision()) throw new ApiError("Phiên đăng nhập đã thay đổi.", 401);
      const currentToken = await authStorage.getAccessToken();
      const freshToken = currentToken && currentToken !== token ? currentToken : await refreshAccessToken();
      if (fetchOptions.signal?.aborted) throw new ApiError("Yêu cầu đã hủy.", 0);
      return await apiRequest<T>(path, { ...options, headers: { ...Object.fromEntries(new Headers(headers).entries()), Authorization: `Bearer ${freshToken}` }, skipAuthRefresh: true });
    }
    if (!response.ok) {
      const fallback = response.status === 401
        ? "Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại."
        : response.status === 403
          ? "Bạn không có quyền thực hiện thao tác này."
          : `Yêu cầu thất bại (${response.status}).`;
      throw new ApiError(getMessage(body, fallback), response.status);
    }
    return unwrapEnvelope<T>(body, response.status);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timeoutController.signal.aborted) {
      throw new ApiError("Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại sau ít phút.", 0);
    }
    throw new ApiError("Chưa kết nối được dữ liệu. Vui lòng thử lại sau.", 0);
  } finally {
    clearTimeout(timeoutId);
    fetchOptions.signal?.removeEventListener("abort", abortRequest);
  }
}
