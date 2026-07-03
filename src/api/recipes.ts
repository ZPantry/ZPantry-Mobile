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

function createRecipeFormData(payload: RecipePayload) {
  const formData = new FormData();
  appendText(formData, "Name", payload.name);
  appendText(formData, "Description", payload.description);
  appendText(formData, "CookingTimeMinutes", payload.cookingTimeMinutes);
  appendText(formData, "Difficulty", payload.difficulty);
  appendText(formData, "ServingSize", payload.servingSize);
  appendText(formData, "InstructionText", payload.instructionText);
  appendText(formData, "SourceType", payload.sourceType);
  appendText(formData, "GradientFrom", payload.gradientFrom || "");
  appendText(formData, "GradientTo", payload.gradientTo || "");
  appendText(formData, "ImageUrl", payload.imageUrl);
  appendText(
    formData,
    "IngredientsJson",
    JSON.stringify(
      (payload.ingredients || []).map((item) => ({
        IngredientId: item.ingredientId,
        Quantity: item.quantity,
        Unit: item.unit,
        IsRequired: item.isRequired,
        Note: item.note
      }))
    )
  );

  if (payload.imageFile) {
    appendFile(formData, "ImageFile", payload.imageFile);
  }

  return formData;
}

export const recipesApi = {
  list(pageIndex = 1, pageSize = 50) {
    return apiRequest<PaginatedResponse<Recipe>>(`/api/recipes?pageIndex=${pageIndex}&pageSize=${pageSize}`, { auth: true });
  },

  get(id: string) {
    return apiRequest<Recipe>(`/api/recipes/${id}`, { auth: true });
  },

  create(payload: RecipePayload) {
    return apiRequest<Recipe>("/api/v2/recipes", {
      method: "POST",
      auth: true,
      body: createRecipeFormData(payload)
    });
  },

  update(id: string, payload: RecipePayload) {
    return apiRequest<Recipe>(`/api/v2/recipes/${id}`, {
      method: "PUT",
      auth: true,
      body: createRecipeFormData(payload)
    });
  },

  remove(id: string) {
    return apiRequest<ApiMessageResponse>(`/api/recipes/${id}`, {
      method: "DELETE",
      auth: true
    });
  }
};
