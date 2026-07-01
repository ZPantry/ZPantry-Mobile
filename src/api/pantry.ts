import { apiRequest, type ApiMessageResponse, type PaginatedResponse } from "@/api/client";

export type PantryApiItem = {
  id: string;
  userId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  expiredAt: string;
  storageLocation: string;
  note: string;
};

export type PantryItemPayload = Pick<PantryApiItem, "ingredientId" | "quantity" | "unit" | "expiredAt" | "storageLocation" | "note">;

export const pantryApi = {
  list(userId: string, pageIndex = 1, pageSize = 50) {
    return apiRequest<PaginatedResponse<PantryApiItem>>(`/api/users/${userId}/pantry?pageIndex=${pageIndex}&pageSize=${pageSize}`, { auth: true });
  },

  saveItem(userId: string, payload: PantryItemPayload) {
    return apiRequest<PantryApiItem>(`/api/users/${userId}/pantry/items`, {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload)
    });
  },

  updateItem(userId: string, itemId: string, payload: PantryItemPayload) {
    return apiRequest<PantryApiItem>(`/api/users/${userId}/pantry/items/${itemId}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify(payload)
    });
  },

  removeItem(userId: string, itemId: string) {
    return apiRequest<ApiMessageResponse>(`/api/users/${userId}/pantry/items/${itemId}`, {
      method: "DELETE",
      auth: true
    });
  }
};
