import { apiRequest, type ApiMessageResponse, type PaginatedResponse } from "@/api/client";
import type { Recipe, RecipeIngredient, UploadFile } from "@/api/recipes";

export type PantryUsageLog = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantityUsed: number;
  unit: string;
  actionType: string;
  warning?: string | null;
};

export type TodayMenuPantryItem = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  expiredAt?: string | null;
  storageLocation?: string | null;
  note?: string | null;
};

export type TodayMenuItem = {
  id: string;
  mealId?: string | null;
  recipeId?: string | null;
  mealName: string;
  mealType: string;
  servingSize: number;
  plannedDate: string;
  status: string;
  note?: string | null;
  cookedAt?: string | null;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  createdAt?: string;
};

export type TodayMenuItemDetail = TodayMenuItem & {
  recipe?: Recipe | null;
  requiredIngredients?: RecipeIngredient[];
  pantryItems?: TodayMenuPantryItem[];
  pantryUsageLogs?: PantryUsageLog[];
};

export type CookingLog = {
  id: string;
  todayMenuItemId: string;
  mealId?: string | null;
  recipeId?: string | null;
  mealName: string;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  cookedAt: string;
  rating?: number | null;
  note?: string | null;
  pantryUsageLogs?: PantryUsageLog[];
};

export type CompleteTodayMenuItemResponse = {
  cookingLog: CookingLog;
  consumedIngredients: PantryUsageLog[];
  updatedPantryItems: TodayMenuPantryItem[];
  warnings: string[];
};

export type AddTodayMenuItemPayload = {
  mealId?: string;
  recipeId?: string;
  mealName: string;
  mealType: string;
  servingSize: number;
  plannedDate: string;
  note?: string;
};

export type CompleteTodayMenuItemPayload = {
  imageFile?: UploadFile | null;
  cookedAt: string;
  rating?: number;
  note?: string;
};

function appendText(formData: FormData, key: string, value: string | number | null | undefined) {
  if (value !== null && value !== undefined && String(value).length > 0) {
    formData.append(key, String(value));
  }
}

function appendFile(formData: FormData, key: string, file: UploadFile) {
  if (typeof File !== "undefined" && file instanceof File) {
    formData.append(key, file);
    return;
  }

  formData.append(key, file as unknown as Blob);
}

function createCompleteFormData(payload: CompleteTodayMenuItemPayload) {
  const formData = new FormData();
  appendText(formData, "CookedAt", payload.cookedAt);
  appendText(formData, "Rating", payload.rating);
  appendText(formData, "Note", payload.note);

  if (payload.imageFile) {
    appendFile(formData, "ImageFile", payload.imageFile);
  }

  return formData;
}

export const todayMenuApi = {
  list(date: string, pageIndex = 1, pageSize = 20) {
    const query = new URLSearchParams({ date, pageIndex: String(pageIndex), pageSize: String(pageSize) });
    return apiRequest<PaginatedResponse<TodayMenuItem>>(`/api/me/today-menu?${query.toString()}`, { auth: true });
  },

  get(id: string) {
    return apiRequest<TodayMenuItemDetail>(`/api/me/today-menu/items/${id}`, { auth: true });
  },

  add(payload: AddTodayMenuItemPayload) {
    return apiRequest<TodayMenuItem>("/api/me/today-menu/items", {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload)
    });
  },

  remove(id: string) {
    return apiRequest<ApiMessageResponse>(`/api/me/today-menu/items/${id}`, {
      method: "DELETE",
      auth: true
    });
  },

  complete(id: string, payload: CompleteTodayMenuItemPayload) {
    return apiRequest<CompleteTodayMenuItemResponse>(`/api/me/today-menu/items/${id}/complete`, {
      method: "POST",
      auth: true,
      body: createCompleteFormData(payload)
    });
  },

  cookingLogs(pageIndex = 1, pageSize = 20) {
    return apiRequest<PaginatedResponse<CookingLog>>(`/api/me/cooking-logs?pageIndex=${pageIndex}&pageSize=${pageSize}`, { auth: true });
  }
};
