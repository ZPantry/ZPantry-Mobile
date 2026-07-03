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

export type PantryItemPayload = Pick<PantryApiItem, "ingredientId" | "quantity" | "unit" | "expiredAt" | "storageLocation" | "note">;

type PantryListResponse = PantryApiItem[] | { data?: PantryApiItem[]; items?: PantryApiItem[] };

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

function normalizePantryItems(response: PantryListResponse) {
  if (Array.isArray(response)) return response;
  return response.data || response.items || [];
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
