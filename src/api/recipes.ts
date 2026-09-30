import { endpoints } from "@/api/endpoints";
import { apiRequest, type ApiMessageResponse, type PaginatedResponse } from "@/api/client";
import type { FoodAllergen } from "@/api/profile";
import { withUploadedImage } from "@/api/media";
import { collectPages } from "@/api/pagination";

export type RecipeIngredientPayload = {
  ingredientId: string;
  quantity: number;
  unit: string;
  isRequired: boolean;
  note: string;
};

export type Recipe = {
  allergens?: FoodAllergen[];
  id: string;
  name: string;
  description: string;
  cookingTimeMinutes: number;
  difficulty: string;
  servingSize: number;
  instructionText: string;
  imageUrl: string;
  sourceType: string;
  gradientFrom?: string;
  gradientTo?: string;
  ingredients?: RecipeIngredient[];
};

export type RecipeIngredient = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  isRequired: boolean;
  note: string;
};

export type NativeUploadFile = {
  uri: string;
  name: string;
  type: string;
};

export type UploadFile = NativeUploadFile | File;

export type RecipePayload = {
  allergens?: FoodAllergen[];
  name: string;
  description: string;
  cookingTimeMinutes: number;
  difficulty: string;
  servingSize: number;
  instructionText: string;
  imageUrl: string;
  sourceType: string;
  gradientFrom?: string;
  gradientTo?: string;
  ingredients?: RecipeIngredientPayload[];
  imageFile?: UploadFile | null;
};

function appendText(formData: FormData, key: string, value: string | number | boolean | null | undefined) {
  formData.append(key, value === null || value === undefined ? "" : String(value));
}

function appendFile(formData: FormData, key: string, file: UploadFile) {
  if (typeof File !== "undefined" && file instanceof File) {
    formData.append(key, file);
    return;
  }

  formData.append(key, file as unknown as Blob);
}

export function createRecipeFormData(payload: RecipePayload) {
  const formData = new FormData();
  appendText(formData, "name", payload.name);
  appendText(formData, "description", payload.description);
  appendText(formData, "cookingTimeMinutes", payload.cookingTimeMinutes);
  appendText(formData, "difficulty", payload.difficulty);
  appendText(formData, "servingSize", payload.servingSize);
  appendText(formData, "instructionText", payload.instructionText);
  appendText(formData, "sourceType", payload.sourceType);
  appendText(formData, "gradientFrom", payload.gradientFrom || "");
  appendText(formData, "gradientTo", payload.gradientTo || "");
  appendText(formData, "imageUrl", payload.imageUrl);
  appendText(
    formData,
    "ingredientsJson",
    JSON.stringify(
      (payload.ingredients || []).map((item) => ({
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unit: item.unit,
        isRequired: item.isRequired,
        note: item.note
      }))
    )
  );

  if (payload.imageFile) {
    appendFile(formData, "imageFile", payload.imageFile);
  }

  return formData;
}

export const recipesApi = {
  all() { return collectPages(page => recipesApi.list(page, 100)); },
  list(pageIndex = 1, pageSize = 50) {
    return apiRequest<PaginatedResponse<Recipe>>(`${endpoints.recipes.list}?pageIndex=${pageIndex}&pageSize=${pageSize}`, { auth: true });
  },

  get(id: string) {
    return apiRequest<Recipe>(endpoints.recipes.item(id), { auth: true });
  },

  async create(payload: RecipePayload) {
    const body = await withUploadedImage(payload);
    return apiRequest<Recipe>(endpoints.recipes.list, {
      method: "POST",
      auth: true,
      body: JSON.stringify(body)
    });
  },

  async update(id: string, payload: RecipePayload) {
    const body = await withUploadedImage(payload);
    return apiRequest<Recipe>(endpoints.recipes.item(id), {
      method: "PUT",
      auth: true,
      body: JSON.stringify(body)
    });
  },

  remove(id: string) {
    return apiRequest<ApiMessageResponse>(endpoints.recipes.item(id), {
      method: "DELETE",
      auth: true
    });
  }
};
