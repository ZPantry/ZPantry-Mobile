import { endpoints } from "@/api/endpoints";
import { apiRequest, type ApiMessageResponse, type PaginatedResponse } from "@/api/client";
import type { UploadFile } from "@/api/recipes";

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
  gradientFrom?: string;
  gradientTo?: string;
};

export type IngredientPayload = Pick<Ingredient, "name" | "category" | "unit" | "caloriesPerUnit" | "proteinPerUnit" | "fatPerUnit" | "carbPerUnit" | "imageUrl" | "gradientFrom" | "gradientTo"> & {
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

export function createIngredientFormData(payload: IngredientPayload) {
  const formData = new FormData();
  appendText(formData, "name", payload.name);
  appendText(formData, "category", payload.category);
  appendText(formData, "unit", payload.unit);
  appendText(formData, "caloriesPerUnit", payload.caloriesPerUnit);
  appendText(formData, "proteinPerUnit", payload.proteinPerUnit);
  appendText(formData, "fatPerUnit", payload.fatPerUnit);
  appendText(formData, "carbPerUnit", payload.carbPerUnit);
  appendText(formData, "gradientFrom", payload.gradientFrom || "");
  appendText(formData, "gradientTo", payload.gradientTo || "");
  appendText(formData, "imageUrl", payload.imageUrl || "");

  if (payload.imageFile) {
    appendFile(formData, "imageFile", payload.imageFile);
  }

  return formData;
}

export const ingredientsApi = {
  list(pageIndex = 1, pageSize = 50) {
    return apiRequest<PaginatedResponse<Ingredient>>(`${endpoints.ingredients.list}?pageIndex=${pageIndex}&pageSize=${pageSize}`, { auth: true });
  },

  search(search: string, pageIndex = 1, pageSize = 10) {
    const params = new URLSearchParams({
      search,
      pageIndex: String(pageIndex),
      pageSize: String(pageSize)
    });

    return apiRequest<PaginatedResponse<Ingredient>>(`${endpoints.ingredients.list}?${params.toString()}`, { auth: true });
  },

  get(id: string) {
    return apiRequest<Ingredient>(endpoints.ingredients.item(id), { auth: true });
  },

  create(payload: IngredientPayload) {
    return apiRequest<Ingredient>(endpoints.ingredients.create, {
      method: "POST",
      auth: true,
      body: createIngredientFormData(payload)
    });
  },

  update(id: string, payload: IngredientPayload) {
    return apiRequest<Ingredient>(endpoints.ingredients.update(id), {
      method: "PUT",
      auth: true,
      body: createIngredientFormData(payload)
    });
  },

  remove(id: string) {
    return apiRequest<ApiMessageResponse>(endpoints.ingredients.item(id), {
      method: "DELETE",
      auth: true
    });
  }
};
