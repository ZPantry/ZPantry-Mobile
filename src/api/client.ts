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
    throw new ApiError("Chưa kết nối được nguồn dữ liệu.", 0);
  }

  const normalizedUrl = API_BASE_URL.replace(/\/+$/, "");

  try {
    const url = new URL(normalizedUrl);
    if (!url.protocol.startsWith("http")) {
      throw new Error("Invalid protocol");
    }
  } catch {
    throw new ApiError("Nguồn dữ liệu chưa sẵn sàng.", 0);
  }

  return normalizedUrl;
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
    throw new ApiError(getMessage(envelope, "Yêu cầu thất bại."), 200);
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
    throw new ApiError("Chưa kết nối được dữ liệu. Vui lòng thử lại sau.", 0);
  }

  const body = await readResponse(response);

  if (!response.ok) {
    throw new ApiError(getMessage(body, `Yêu cầu thất bại (${response.status}).`), response.status);
  }

  return unwrapEnvelope<T>(body);
}
