import { endpoints } from "@/api/endpoints";
import { apiRequest } from "@/api/client";
import { ApiError, unwrapEnvelope } from "@/api/response";
import { translateRecommendationText } from "@/utils/localize";

export type IngredientItem = {
  ingredientId?: string | null;
  name: string;
  quantity?: number | null;
  unit?: string | null;
};

export type CandidateRecipeItem = {
  recipeId: string;
  recipeName: string;
  ingredientNames: string[];
  instructionText?: string | null;
};

export type MealRecommendationRequest = {
  inputIngredientText: string;
  ingredients?: string[];
  selectedIngredients?: IngredientItem[];
  candidateRecipes?: CandidateRecipeItem[];
  topK?: number;
};

export type MealRecommendation = {
  mealId: string;
  persistedMeal?: boolean;
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
  ImageUrl?: string;
  mealImageUrl?: string;
  thumbnailUrl?: string;
  note?: string;
  recipe?: {
    id?: string;
    name?: string;
    description?: string;
    imageUrl?: string;
    ImageUrl?: string;
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
  const description = item.description || item.reason || item.recipe?.description || "Món phù hợp với nguyên liệu bạn đang có.";
  const reason = item.note || item.reason || "";

  return {
    mealId,
    recipeId,
    name: item.name || item.mealName || item.recipeName || item.recipe?.name || "Món được gợi ý",
    description: translateRecommendationText(description),
    imageUrl: item.imageUrl || item.ImageUrl || item.mealImageUrl || item.thumbnailUrl || item.recipe?.imageUrl || item.recipe?.ImageUrl,
    score: normalizeScore(item.score ?? item.matchScore ?? item.confidence),
    rank: item.rank || index + 1,
    reason: translateRecommendationText(reason),
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
  async personalized(topK = 5) {
    const response = await apiRequest<unknown>(endpoints.recommendations.personalized, {
      method: "POST", auth: true, body: JSON.stringify({ topK }), timeoutMs: 60000
    });
    // Java wraps the AI service envelope; validate both layers before normalizing.
    const body = unwrapEnvelope<RawMealRecommendationResponse>(response);
    if (!body || ![body.items, body.recommendations, body.meals].some(Array.isArray))
      throw new ApiError("Dữ liệu gợi ý chưa đầy đủ. Vui lòng thử lại.", 502);
    const result = normalizeRecommendationResponse(body);
    return { recommendations: result.recommendations.map((item) => ({ ...item, persistedMeal: false })) };
  },
  async suggestMeals(payload: MealRecommendationRequest) {
    const response = await apiRequest<unknown>(endpoints.recommendations.meals, {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload),
      timeoutMs: 60000
    });
    const body = unwrapEnvelope<RawMealRecommendationResponse>(response);
    if (!body || ![body.items, body.recommendations, body.meals].some(Array.isArray))
      throw new ApiError("Dữ liệu gợi ý chưa đầy đủ. Vui lòng thử lại.", 502);
    const result = normalizeRecommendationResponse(body);
    // V1 persists the request, but does not return persisted meal item IDs.
    return { recommendations: result.recommendations.map((item) => ({ ...item, persistedMeal: false })) };
  },

  async checkMealIngredients(mealId: string) {
    const response = await apiRequest<unknown>(endpoints.recommendations.missingIngredients(mealId), {
      auth: true
    });

    return normalizeMealIngredientCheck(response);
  }
};
