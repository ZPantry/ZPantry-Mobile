import { apiRequest, type ApiMessageResponse } from "@/api/client";

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
  expiredAt: string;
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
  return {
    ...payload,
    expiredAt: toUtcIsoDate(payload.expiredAt)
  };
}

function normalizePantryItem(item: RawPantryApiItem): PantryApiItem {
  return {
    ...item,
    quantity: Number(item.quantity ?? 0),
    unit: item.unit || "",
    expiredAt: item.expiredAt || new Date().toISOString(),
    storageLocation: item.storageLocation || "",
    note: item.note || ""
  };
}

function normalizePantryItems(response: PantryListResponse) {
  const items = Array.isArray(response) ? response : response.data || response.items || response.Data || response.Items || [];
  return items.map(normalizePantryItem);
}

export const pantryApi = {
  async list(pageIndex = 1, pageSize = 50) {
    const response = await apiRequest<PantryListResponse>(`/api/me/pantry?pageIndex=${pageIndex}&pageSize=${pageSize}`, { auth: true });
    return normalizePantryItems(response);
  },

  saveItem(payload: PantryItemPayload) {
    return apiRequest<PantryApiItem>("/api/me/pantry/items", {
      method: "POST",
      auth: true,
      body: JSON.stringify(normalizePayload(payload))
    });
  },

  updateItem(itemId: string, payload: PantryItemPayload) {
    return apiRequest<PantryApiItem>(`/api/me/pantry/items/${itemId}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify(normalizePayload(payload))
    });
  },

  removeItem(itemId: string) {
    return apiRequest<ApiMessageResponse>(`/api/me/pantry/items/${itemId}`, {
      method: "DELETE",
      auth: true
    });
  }
};
