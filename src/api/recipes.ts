import { apiRequest, type ApiMessageResponse, type PaginatedResponse } from "@/api/client";

export type RecipeIngredientPayload = {
  ingredientId: string;
  ingredientName?: string;
  quantity: number;
  unit: string;
  isRequired: boolean;
  note: string;
};

export type Recipe = {
  id: string;
  name: string;
  description?: string | null;
  cookingTimeMinutes?: number | null;
  difficulty?: string | null;
  servingSize?: number | null;
  instructionText?: string | null;
  imageUrl?: string | null;
  sourceType?: string | null;
  gradientFrom?: string | null;
  gradientTo?: string | null;
  ingredients?: RecipeIngredientPayload[];
};

export type RecipePayload = Omit<Recipe, "id"> & {
  gradientFrom?: string;
  gradientTo?: string;
  ingredients: RecipeIngredientPayload[];
};

export const recipesApi = {
  list(pageIndex = 1, pageSize = 50) {
    return apiRequest<PaginatedResponse<Recipe>>(`/api/recipes?pageIndex=${pageIndex}&pageSize=${pageSize}`, { auth: true });
  },

  get(id: string) {
    return apiRequest<Recipe>(`/api/recipes/${id}`, { auth: true });
  },

  create(payload: RecipePayload) {
    return apiRequest<Recipe>("/api/recipes", {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload)
    });
  },

  update(id: string, payload: RecipePayload) {
    return apiRequest<Recipe>(`/api/recipes/${id}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify(payload)
    });
  },

  remove(id: string) {
    return apiRequest<ApiMessageResponse>(`/api/recipes/${id}`, {
      method: "DELETE",
      auth: true
    });
  }
};
