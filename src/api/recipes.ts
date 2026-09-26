import { endpoints } from "@/api/endpoints";
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
  list(pageIndex = 1, pageSize = 50) {
    return apiRequest<PaginatedResponse<Recipe>>(`${endpoints.recipes.list}?pageIndex=${pageIndex}&pageSize=${pageSize}`, { auth: true });
  },

  get(id: string) {
    return apiRequest<Recipe>(endpoints.recipes.item(id), { auth: true });
  },

  create(payload: RecipePayload) {
    return apiRequest<Recipe>(endpoints.recipes.create, {
      method: "POST",
      auth: true,
      body: createRecipeFormData(payload)
    });
  },

  update(id: string, payload: RecipePayload) {
    return apiRequest<Recipe>(endpoints.recipes.update(id), {
      method: "PUT",
      auth: true,
      body: createRecipeFormData(payload)
    });
  },

  remove(id: string) {
    return apiRequest<ApiMessageResponse>(endpoints.recipes.item(id), {
      method: "DELETE",
      auth: true
    });
  }
};
