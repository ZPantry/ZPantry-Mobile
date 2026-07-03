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

function createIngredientFormData(payload: IngredientPayload) {
  const formData = new FormData();
  appendText(formData, "Name", payload.name);
  appendText(formData, "Category", payload.category);
  appendText(formData, "Unit", payload.unit);
  appendText(formData, "CaloriesPerUnit", payload.caloriesPerUnit);
  appendText(formData, "ProteinPerUnit", payload.proteinPerUnit);
  appendText(formData, "FatPerUnit", payload.fatPerUnit);
  appendText(formData, "CarbPerUnit", payload.carbPerUnit);
  appendText(formData, "GradientFrom", payload.gradientFrom || "");
  appendText(formData, "GradientTo", payload.gradientTo || "");
  appendText(formData, "ImageUrl", payload.imageUrl || "");

  if (payload.imageFile) {
    appendFile(formData, "ImageFile", payload.imageFile);
  }

  return formData;
}

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
    return apiRequest<Ingredient>("/api/v2/ingredients", {
      method: "POST",
      auth: true,
      body: createIngredientFormData(payload)
    });
  },

  update(id: string, payload: IngredientPayload) {
    return apiRequest<Ingredient>(`/api/v2/ingredients/${id}`, {
      method: "PUT",
      auth: true,
      body: createIngredientFormData(payload)
    });
  },

  remove(id: string) {
    return apiRequest<ApiMessageResponse>(`/api/ingredients/${id}`, {
      method: "DELETE",
      auth: true
    });
  }
};
