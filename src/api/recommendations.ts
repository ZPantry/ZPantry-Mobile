import { apiRequest } from "@/api/client";

export type MealRecommendationRequest = {
  topK?: number;
  inputIngredientText?: string;
  ingredients?: string[];
  selectedIngredients?: Array<{
    ingredientId: string;
    name?: string;
    quantity: number;
    unit: string;
  }>;
};

export type MealRecommendation = {
  mealId: string;
  recipeId: string;
  name: string;
  description: string;
  imageUrl?: string;
  score: number;
  rank?: number;
  reason?: string;
  missingIngredientCount?: number;
  matchedIngredients: string[];
  missingIngredients: string[];
};

export type MealRecommendationResponse = {
  recommendations: MealRecommendation[];
};

export type MealIngredientStatus = {
  ingredientId?: string;
  name: string;
  quantity?: number;
  requiredQuantity?: number;
  unit?: string;
};

export type MealIngredientCheckResponse = {
  availableIngredients: MealIngredientStatus[];
  missingIngredients: MealIngredientStatus[];
  note?: string;
};

type RawIngredientName = string | { name?: string; ingredientName?: string; ingredientId?: string };

type RawMealRecommendation = Partial<MealRecommendation> & {
  id?: string;
  mealId?: string;
  mealName?: string;
  imageUrl?: string;
  mealImageUrl?: string;
  thumbnailUrl?: string;
  note?: string;
  recipe?: {
    id?: string;
    name?: string;
    description?: string;
    imageUrl?: string;
  };
  recipeName?: string;
  matchScore?: number;
  confidence?: number;
  matchedIngredients?: RawIngredientName[];
  missingIngredients?: RawIngredientName[];
  matchingIngredientNames?: RawIngredientName[];
  missingIngredientNames?: RawIngredientName[];
  matching?: RawIngredientName[];
  missing?: RawIngredientName[];
};

type RawMealRecommendationResponse = Partial<MealRecommendationResponse> & {
  items?: RawMealRecommendation[];
  meals?: RawMealRecommendation[];
};

function normalizeScore(value: unknown) {
  const score = Number(value ?? 0);
  if (!Number.isFinite(score)) return 0;
  return score > 0 && score <= 1 ? score * 100 : score;
}

function normalizeIngredientNames(items: RawIngredientName[] | undefined) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (typeof item === "string") return item;
      return item.name || item.ingredientName || "";
    })
    .filter(Boolean);
}

function normalizeRecommendation(item: RawMealRecommendation, index: number): MealRecommendation {
  const mealId = item.mealId || item.recipeId || item.id || item.recipe?.id || `recommendation-${index}`;
  const recipeId = item.recipeId || item.recipe?.id || mealId;

  return {
    mealId,
    recipeId,
    name: item.name || item.mealName || item.recipeName || item.recipe?.name || "Món được gợi ý",
    description: item.description || item.reason || item.recipe?.description || "Món phù hợp với nguyên liệu bạn đang có.",
    imageUrl: item.imageUrl || item.mealImageUrl || item.thumbnailUrl || item.recipe?.imageUrl,
    score: normalizeScore(item.score ?? item.matchScore ?? item.confidence),
    rank: item.rank || index + 1,
    reason: item.note || item.reason || "",
    missingIngredientCount: Number(item.missingIngredientCount ?? item.missingIngredientNames?.length ?? item.missingIngredients?.length ?? 0),
    matchedIngredients: normalizeIngredientNames(item.matchedIngredients || item.matchingIngredientNames || item.matching),
    missingIngredients: normalizeIngredientNames(item.missingIngredients || item.missingIngredientNames || item.missing)
  };
}

function normalizeRecommendationResponse(body: RawMealRecommendationResponse): MealRecommendationResponse {
  const items = Array.isArray(body.recommendations) ? body.recommendations : Array.isArray(body.items) ? body.items : Array.isArray(body.meals) ? body.meals : [];
  return {
    recommendations: items.map(normalizeRecommendation)
  };
}

function normalizeIngredientStatus(items: unknown): MealIngredientStatus[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (typeof item === "string") return { name: item };
      if (!item || typeof item !== "object") return null;

      const value = item as Record<string, unknown>;
      return {
        ingredientId: typeof value.ingredientId === "string" ? value.ingredientId : undefined,
        name: String(value.name || value.ingredientName || "Nguyên liệu"),
        quantity: typeof value.quantity === "number" ? value.quantity : undefined,
        requiredQuantity: typeof value.requiredQuantity === "number" ? value.requiredQuantity : undefined,
        unit: typeof value.unit === "string" ? value.unit : undefined
      };
    })
    .filter((item): item is MealIngredientStatus => Boolean(item));
}

function normalizeMealIngredientCheck(body: unknown): MealIngredientCheckResponse {
  const value = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  return {
    availableIngredients: normalizeIngredientStatus(value.availableIngredients),
    missingIngredients: normalizeIngredientStatus(value.missingIngredients),
    note: typeof value.note === "string" ? value.note : undefined
  };
}

export const recommendationsApi = {
  async suggestMeals(payload: MealRecommendationRequest = {}) {
    const response = await apiRequest<RawMealRecommendationResponse>("/api/recommendations/meals", {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload)
    });

    return normalizeRecommendationResponse(response);
  },

  async checkMealIngredients(mealId: string) {
    const response = await apiRequest<unknown>(`/api/recommendations/meals/${mealId}/missing-ingredients`, {
      auth: true
    });

    return normalizeMealIngredientCheck(response);
  }
};
