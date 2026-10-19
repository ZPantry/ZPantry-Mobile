import { endpoints } from "@/api/endpoints";
import { apiRequest, type ApiMessageResponse, type PaginatedResponse } from "@/api/client";
import type { Recipe, RecipeIngredient, UploadFile } from "@/api/recipes";
import { recipesApi } from "@/api/recipes";
import { pantryApi } from "@/api/pantry";
import { collectPages } from "@/api/pagination";
import { appendUploadFile } from "@/api/uploadFile";

export type PantryUsageLog = {
  id?: string;
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
  cookingLog?: CookingLog | null;
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
  updatedPantryItems: Array<Pick<TodayMenuPantryItem, "id" | "ingredientId" | "quantity">>;
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
  cookedAt?: string;
  rating?: number;
  note?: string;
};

function appendText(formData: FormData, key: string, value: string | number | null | undefined) {
  if (value !== null && value !== undefined && String(value).length > 0) {
    formData.append(key, String(value));
  }
}

function createCompleteFormData(payload: CompleteTodayMenuItemPayload) {
  const formData = new FormData();
  appendText(formData, "cookedAt", payload.cookedAt);
  appendText(formData, "rating", payload.rating);
  // An explicit empty note must not fall back to the old planning note in Java.
  if (payload.note !== undefined) formData.append("note", payload.note);

  if (payload.imageFile) {
    appendUploadFile(formData, "imageFile", payload.imageFile);
  }

  return formData;
}

async function findCookingLog(itemId: string): Promise<CookingLog | null> {
  // Java exposes paged history, without a per-menu-item log endpoint/filter.
  for (let page = 1; page <= 1000; page++) {
    const result = await apiRequest<PaginatedResponse<CookingLog>>(
      `${endpoints.todayMenu.cookingLogs}?pageIndex=${page}&pageSize=100`, { auth: true }
    );
    const log = result.data.find(row => row.todayMenuItemId === itemId);
    if (log) return log;
    if (!result.hasNextPage || !result.data.length) return null;
  }
  throw new Error("Chưa tải được nhật ký của món ăn. Vui lòng thử lại.");
}

export const todayMenuApi = {
  all(date: string) { return collectPages(page => todayMenuApi.list(date, page, 100)); },
  list(date: string, pageIndex = 1, pageSize = 20) {
    const query = new URLSearchParams({ date, pageIndex: String(pageIndex), pageSize: String(pageSize) });
    return apiRequest<PaginatedResponse<TodayMenuItem>>(`${endpoints.todayMenu.list}?${query.toString()}`, { auth: true });
  },

  async get(id: string): Promise<TodayMenuItemDetail> {
    const item = await apiRequest<TodayMenuItemDetail>(endpoints.todayMenu.item(id), { auth: true });
    const recipeId = item.recipeId || item.mealId;
    const isCooked = ["cooked", "completed"].includes((item.status || "").toLowerCase());
    if (isCooked) {
      // Rating and post-cooking note belong to CookingLog, not menu metadata.
      const cookingLog = await findCookingLog(id);
      return { ...item, cookingLog, imageUrl: cookingLog?.imageUrl || item.imageUrl };
    }
    // Current Java detail returns menu metadata. Compose its documented endpoints.
    const [recipe, pantry] = await Promise.all([
      item.recipe ?? (recipeId ? recipesApi.get(recipeId) : Promise.resolve(null)),
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
