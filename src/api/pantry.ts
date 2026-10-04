import { endpoints } from "@/api/endpoints";
import { apiRequest, type ApiMessageResponse } from "@/api/client";
import { ApiError, type PaginatedResponse } from "@/api/response";
import { collectPages } from "@/api/pagination";

export type PantryApiItem = {
  id: string;
  ingredientId: string;
  ingredientName?: string;
  quantity: number;
  unit: string;
  expiredAt: string;
  storageLocation: string;
  note: string;
};

export type PantryItemPayload = {
  ingredientId: string;
  quantity: number;
  unit: string;
  expiredAt?: string | null;
  storageLocation: string;
  note: string;
};

type RawPantryApiItem = Omit<PantryApiItem, "quantity" | "unit" | "expiredAt" | "storageLocation" | "note"> & {
  quantity?: number | null;
  unit?: string | null;
  expiredAt?: string | null;
  storageLocation?: string | null;
  note?: string | null;
};

type PantryListResponse = RawPantryApiItem[] | { data?: RawPantryApiItem[]; items?: RawPantryApiItem[]; Data?: RawPantryApiItem[]; Items?: RawPantryApiItem[] };

function toUtcIsoDate(value: string) {
  const trimmed = value.trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? new Date(`${trimmed}T00:00:00.000Z`) : new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    return trimmed;
  }

  return date.toISOString();
}

function normalizePayload(payload: PantryItemPayload): PantryItemPayload {
  if (!payload.ingredientId || !Number.isFinite(payload.quantity) || payload.quantity <= 0 || !payload.unit.trim())
    throw new ApiError("Chọn nguyên liệu, số lượng lớn hơn 0 và đơn vị hợp lệ.", 400);
  if (payload.expiredAt && Number.isNaN(Date.parse(payload.expiredAt))) throw new ApiError("Hạn sử dụng không hợp lệ.", 400);
  return {
    ...payload,
    expiredAt: payload.expiredAt ? toUtcIsoDate(payload.expiredAt) : payload.expiredAt
  };
}

function normalizePantryItem(item: RawPantryApiItem): PantryApiItem {
  return {
    ...item,
    quantity: Number(item.quantity ?? 0),
    unit: item.unit || "",
    expiredAt: item.expiredAt || "",
    storageLocation: item.storageLocation || "",
    note: item.note || ""
  };
}

function normalizePantryItems(response: PantryListResponse) {
  const items = Array.isArray(response) ? response : response.data || response.items || response.Data || response.Items || [];
  return items.map(normalizePantryItem);
}

export const pantryApi = {
  async saveItems(items: PantryItemPayload[]) {
    if (!items.length) throw new ApiError("Vui lòng chọn ít nhất một nguyên liệu.", 400);
    if (new Set(items.map(item => item.ingredientId)).size !== items.length)
      throw new ApiError("Mỗi nguyên liệu chỉ được xuất hiện một lần.", 400);
    const response = await apiRequest<RawPantryApiItem[]>(endpoints.pantry.batch, {
      method: "POST", auth: true,
      body: JSON.stringify({ items: items.map(normalizePayload) })
    });
    return response.map(normalizePantryItem);
  },
  async all() {
    return (await collectPages(page => apiRequest<PaginatedResponse<RawPantryApiItem>>(`${endpoints.pantry.list}?pageIndex=${page}&pageSize=100`, { auth: true }))).map(normalizePantryItem);
  },
  async list(pageIndex = 1, pageSize = 50) {
    const response = await apiRequest<PantryListResponse>(`${endpoints.pantry.list}?pageIndex=${pageIndex}&pageSize=${pageSize}`, { auth: true });
    return normalizePantryItems(response);
  },

  saveItem(payload: PantryItemPayload) {
    return apiRequest<PantryApiItem>(endpoints.pantry.create, {
      method: "POST",
      auth: true,
      body: JSON.stringify(normalizePayload(payload))
    });
  },

  updateItem(itemId: string, payload: PantryItemPayload) {
    return apiRequest<PantryApiItem>(endpoints.pantry.item(itemId), {
      method: "PUT",
      auth: true,
      body: JSON.stringify(normalizePayload(payload))
    });
  },

  removeItem(itemId: string) {
    return apiRequest<ApiMessageResponse>(endpoints.pantry.item(itemId), {
      method: "DELETE",
      auth: true
    });
  }
};
