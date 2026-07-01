import { apiRequest, type ApiMessageResponse, type PaginatedResponse } from "@/api/client";

export type RecipeIngredientPayload = {
  ingredientId: string;
  quantity: number;
  unit: string;
  isRequired: boolean;
  note: string;
};

export type Recipe = {
  id: string;
  name: string;
  description: string;
  cookingTimeMinutes: number;
  difficulty: string;
  servingSize: number;
  instructionText: string;
  imageUrl: string;
  sourceType: string;
};

export type RecipePayload = Omit<Recipe, "id"> & {
  ingredients?: RecipeIngredientPayload[];
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
