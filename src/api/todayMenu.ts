import { endpoints } from "@/api/endpoints";
import { apiRequest, type ApiMessageResponse, type PaginatedResponse } from "@/api/client";
import type { Recipe, RecipeIngredient, UploadFile } from "@/api/recipes";
import { recipesApi } from "@/api/recipes";
import { pantryApi } from "@/api/pantry";
import { collectPages } from "@/api/pagination";

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

export type IngredientAvailability = {
  ingredientId: string;
  ingredientName: string;
  requiredQuantity: number;
  availableQuantity: number;
  missingQuantity: number;
  unit: string;
  unitMismatch: boolean;
};

export type IngredientAvailabilityResponse = {
  todayMenuItemId: string;
  sufficient: boolean;
  ingredients: IngredientAvailability[];
};
export type DailyNutrition = { date: string; targetCalories: number | null; consumedCalories: number; remainingCalories: number | null };

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
  appendText(formData, "cookedAt", payload.cookedAt);
  appendText(formData, "rating", payload.rating);
  appendText(formData, "note", payload.note);

  if (payload.imageFile) {
    appendFile(formData, "imageFile", payload.imageFile);
  }

  return formData;
}

export const todayMenuApi = {
  all(date: string) { return collectPages(page => todayMenuApi.list(date, page, 100)); },
  list(date: string, pageIndex = 1, pageSize = 20) {
    const query = new URLSearchParams({ date, pageIndex: String(pageIndex), pageSize: String(pageSize) });
    return apiRequest<PaginatedResponse<TodayMenuItem>>(`${endpoints.todayMenu.list}?${query.toString()}`, { auth: true });
  },

  async get(id: string): Promise<TodayMenuItemDetail> {
    const item = await apiRequest<TodayMenuItemDetail>(endpoints.todayMenu.item(id), { auth: true });
    // Current Java detail returns menu metadata. Compose its documented endpoints.
    const [recipe, pantry] = await Promise.all([
      item.recipe ?? (item.recipeId ? recipesApi.get(item.recipeId) : Promise.resolve(null)),
      item.pantryItems ?? pantryApi.all()
    ]);
    const ingredients = recipe?.ingredients ?? [];
    const ids = new Set(ingredients.map(ingredient => ingredient.ingredientId));
    const portionRatio = item.servingSize > 0 && recipe && recipe.servingSize > 0 ? item.servingSize / recipe.servingSize : 1;
    return { ...item, recipe, requiredIngredients: item.requiredIngredients ?? ingredients.map(ingredient => ({ ...ingredient, quantity: Number((ingredient.quantity * portionRatio).toFixed(4)) })),
      pantryItems: pantry.filter(row => ids.has(row.ingredientId)).map(row => ({ ...row, ingredientName: row.ingredientName || ingredients.find(i => i.ingredientId === row.ingredientId)?.ingredientName || "Nguyên liệu" })) };
  },

  ingredientAvailability(id: string) {
    return apiRequest<IngredientAvailabilityResponse>(endpoints.todayMenu.ingredientAvailability(id), { auth: true });
  },

  addMissingIngredientsToShoppingList(id: string) {
    return apiRequest<unknown[]>(endpoints.todayMenu.missingIngredients(id), { method: "POST", auth: true });
  },

  add(payload: AddTodayMenuItemPayload) {
    return apiRequest<TodayMenuItem>(endpoints.todayMenu.create, {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload)
    });
  },

  remove(id: string) {
    return apiRequest<ApiMessageResponse>(endpoints.todayMenu.item(id), {
      method: "DELETE",
      auth: true
    });
  },

  complete(id: string, payload: CompleteTodayMenuItemPayload) {
    return apiRequest<CompleteTodayMenuItemResponse>(endpoints.todayMenu.complete(id), {
      method: "POST",
      auth: true,
      body: createCompleteFormData(payload)
    });
  },

  cookingLogs(pageIndex = 1, pageSize = 20) {
    return apiRequest<PaginatedResponse<CookingLog>>(`${endpoints.todayMenu.cookingLogs}?pageIndex=${pageIndex}&pageSize=${pageSize}`, { auth: true });
  },
  dailyNutrition(date?: string) { return apiRequest<DailyNutrition>(`${endpoints.todayMenu.dailyNutrition}${date ? `?date=${encodeURIComponent(date)}` : ""}`, { auth: true }); }
};
