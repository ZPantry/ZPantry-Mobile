import { Platform } from "react-native";
import { authStorage } from "@/utils/authStorage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export type ApiMessageResponse = {
  message: string;
};

export type PaginatedResponse<T> = {
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  data: T[];
  items: T[];
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
  traceId?: string;
  timestamp?: string;
  pageIndex?: number;
  pageSize?: number;
  totalCount?: number;
  totalItems?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  items?: T;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new ApiError("Chua ket noi duoc nguon du lieu.", 0);
  }

  const normalizedUrl = API_BASE_URL.replace(/\/+$/, "");
  let urlToUse = normalizedUrl;

  try {
    const parsed = new URL(normalizedUrl);
    const isLoopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (Platform.OS === "android" && isLoopback) {
      parsed.hostname = "10.0.2.2";
      urlToUse = parsed.toString().replace(/\/+$/, "");
    }
  } catch {
    // validated below
  }

  try {
    const url = new URL(urlToUse);
    if (!url.protocol.startsWith("http")) {
      throw new Error("Invalid protocol");
    }
  } catch {
    throw new ApiError("Nguon du lieu chua san sang.", 0);
  }

  return urlToUse;
}

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function getMessage(body: unknown, fallback: string) {
  if (isObject(body) && typeof body.message === "string" && body.message.trim()) {
    return body.message;
  }

  if (isObject(body) && Array.isArray(body.errors) && body.errors.length > 0) {
    return body.errors
      .map((error) => {
        if (isObject(error) && typeof error.message === "string") return error.message;
        return String(error);
      })
      .join("\n");
  }

  if (typeof body === "string") {
    return body;
  }

  return fallback;
}

function unwrapEnvelope<T>(body: unknown): T {
  if (!isObject(body)) {
    return body as T;
  }

  const envelope = body as ApiEnvelope<T>;
  const hasEnvelopeShape = "success" in envelope || "data" in envelope || "errors" in envelope || "traceId" in envelope;

  if (!hasEnvelopeShape) {
    return body as T;
  }

  if (envelope.success === false) {
    throw new ApiError(getMessage(envelope, "Yeu cau that bai."), 200);
  }

  if ((Array.isArray(envelope.data) || Array.isArray(envelope.items)) && "pageIndex" in envelope) {
    const items = Array.isArray(envelope.data) ? envelope.data : (envelope.items as T[]);
    const totalItems = Number(envelope.totalItems ?? envelope.totalCount ?? items.length);

    return {
      pageIndex: Number(envelope.pageIndex ?? 1),
      pageSize: Number(envelope.pageSize ?? items.length),
      totalItems,
      totalCount: totalItems,
      totalPages: Number(envelope.totalPages ?? Math.max(1, Math.ceil(totalItems / Math.max(1, Number(envelope.pageSize ?? items.length))))),
      hasNextPage: Boolean(envelope.hasNextPage),
      hasPreviousPage: Boolean(envelope.hasPreviousPage),
      data: items,
      items
    } as T;
  }

  if (envelope.data !== undefined && envelope.data !== null) {
    return envelope.data;
  }

  return { message: envelope.message || "" } as T;
}

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = false, headers, ...fetchOptions } = options;
  const token = auth ? await authStorage.getAccessToken() : null;
  const url = `${getApiBaseUrl()}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers
      }
    });
  } catch {
    throw new ApiError("Chua ket noi duoc du lieu. Vui long thu lai sau.", 0);
  }

  const body = await readResponse(response);

  if (!response.ok) {
    throw new ApiError(getMessage(body, `Yeu cau that bai (${response.status}).`), response.status);
  }

  return unwrapEnvelope<T>(body);
}
