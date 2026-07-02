import { apiRequest, type ApiMessageResponse, type PaginatedResponse } from "@/api/client";

export type Ingredient = {
  id: string;
  name: string;
  normalizedName: string;
  category: string;
  unit: string;
  defaultUnit?: string;
  caloriesPerUnit: number;
  proteinPerUnit: number;
  fatPerUnit: number;
  carbPerUnit: number;
  imageUrl: string | null;
};

export type IngredientPayload = Pick<Ingredient, "name" | "category" | "unit" | "caloriesPerUnit" | "proteinPerUnit" | "fatPerUnit" | "carbPerUnit" | "imageUrl">;

export const ingredientsApi = {
  list(pageIndex = 1, pageSize = 50) {
    return apiRequest<PaginatedResponse<Ingredient>>(`/api/ingredients?pageIndex=${pageIndex}&pageSize=${pageSize}`, { auth: true });
  },

  search(search: string, pageIndex = 1, pageSize = 10) {
    const params = new URLSearchParams({
      search,
      pageIndex: String(pageIndex),
      pageSize: String(pageSize)
    });

    return apiRequest<PaginatedResponse<Ingredient>>(`/api/ingredients?${params.toString()}`, { auth: true });
  },

  get(id: string) {
    return apiRequest<Ingredient>(`/api/ingredients/${id}`, { auth: true });
  },

  create(payload: IngredientPayload) {
    return apiRequest<Ingredient>("/api/ingredients", {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload)
    });
  },

  update(id: string, payload: IngredientPayload) {
    return apiRequest<Ingredient>(`/api/ingredients/${id}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify(payload)
    });
  },

  remove(id: string) {
    return apiRequest<ApiMessageResponse>(`/api/ingredients/${id}`, {
      method: "DELETE",
      auth: true
    });
  }
};
