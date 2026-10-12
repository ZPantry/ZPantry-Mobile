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

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function getMessage(body: unknown, fallback: string) {
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

  // Framework validation failures may use a field -> messages object.
  if (isObject(body) && isObject(body.errors)) {
    const messages = Object.values(body.errors).flatMap((value) =>
      Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : typeof value === "string" ? [value] : []
    );
    if (messages.length) return messages.join("\n");
  }

  if (isObject(body) && typeof body.title === "string" && body.title.trim()) return body.title;

  if (typeof body === "string" && body.trim()) {
    return body;
  }

  return fallback;
}

export function unwrapEnvelope<T>(body: unknown, status = 200): T {
  if (!isObject(body)) {
    return body as T;
  }

  const envelope = body as ApiEnvelope<T>;
  const hasEnvelopeShape = "success" in envelope || "data" in envelope || "errors" in envelope || "traceId" in envelope;

  if (!hasEnvelopeShape) {
    return body as T;
  }

  if (envelope.success === false) {
    throw new ApiError(getMessage(envelope, "Yêu cầu thất bại."), status);
  }

  if ((Array.isArray(envelope.data) || Array.isArray(envelope.items)) && "pageIndex" in envelope) {
    const items = Array.isArray(envelope.data) ? envelope.data : (envelope.items as T[]);
    const totalItems = Number(envelope.totalItems ?? envelope.totalCount ?? items.length);
    const pageIndex = Number(envelope.pageIndex ?? 1);
    const pageSize = Number(envelope.pageSize ?? Math.max(1, items.length));
    const totalPages = Number(envelope.totalPages ?? Math.ceil(totalItems / Math.max(1, pageSize)));

    return {
      pageIndex,
      pageSize,
      totalItems,
      totalCount: totalItems,
      totalPages,
      hasNextPage: envelope.hasNextPage ?? pageIndex < totalPages,
      hasPreviousPage: envelope.hasPreviousPage ?? pageIndex > 1,
      data: items,
      items
    } as T;
  }

  if (envelope.data !== undefined && envelope.data !== null) {
    return envelope.data;
  }

  return { message: envelope.message || "" } as T;
}

