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
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = false, headers, timeoutMs = 30000, ...fetchOptions } = options;
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
