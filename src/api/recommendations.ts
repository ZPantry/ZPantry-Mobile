import { apiRequest } from "@/api/client";

export type SelectedIngredientPayload = {
  ingredientId: string;
  name?: string;
  quantity: number;
  unit: string;
};

export type MealRecommendationRequest = {
  userId: string;
  inputIngredientText: string;
  ingredients: string[];
  selectedIngredients: SelectedIngredientPayload[];
  candidateRecipes: string[];
  topK: number;
};

export type MealRecommendation = {
  recipeId: string;
  name: string;
  description: string;
  score: number;
  rank?: number;
  reason?: string;
  missingIngredientCount?: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  imageUrl?: string;
  gradientFrom?: string;
  gradientTo?: string;
};

export type MealRecommendationResponse = {
  recommendations: MealRecommendation[];
};

type RawMealRecommendation = Partial<MealRecommendation> & {
  id?: string;
  recipe?: {
    id?: string;
    name?: string;
    description?: string;
    imageUrl?: string;
    gradientFrom?: string | null;
    gradientTo?: string | null;
  };
  recipeName?: string;
  matchScore?: number;
  confidence?: number;
  matchingIngredientNames?: string[];
  missingIngredientNames?: string[];
  matching?: string[];
  missing?: string[];
};

type RawMealRecommendationResponse = Partial<MealRecommendationResponse> & {
  items?: RawMealRecommendation[];
};

function normalizeScore(value: unknown) {
  const score = Number(value ?? 0);
  if (!Number.isFinite(score)) return 0;
  return score > 0 && score <= 1 ? score * 100 : score;
}

function normalizeRecommendation(item: RawMealRecommendation, index: number): MealRecommendation {
  const recipeId = item.recipeId || item.id || item.recipe?.id || `recommendation-${index}`;

  return {
    recipeId,
    name: item.name || item.recipeName || item.recipe?.name || "Món được gợi ý",
    description: item.description || item.reason || item.recipe?.description || "Món phù hợp với nguyên liệu bạn đang có.",
    score: normalizeScore(item.score ?? item.matchScore ?? item.confidence),
    rank: item.rank || index + 1,
    reason: item.reason || "",
    missingIngredientCount: Number(item.missingIngredientCount ?? item.missingIngredientNames?.length ?? item.missingIngredients?.length ?? 0),
    matchedIngredients: item.matchedIngredients || item.matchingIngredientNames || item.matching || [],
    missingIngredients: item.missingIngredients || item.missingIngredientNames || item.missing || [],
    imageUrl: item.imageUrl || item.recipe?.imageUrl || undefined,
    gradientFrom: item.gradientFrom || item.recipe?.gradientFrom || undefined,
    gradientTo: item.gradientTo || item.recipe?.gradientTo || undefined
  };
}

function normalizeRecommendationResponse(body: RawMealRecommendationResponse): MealRecommendationResponse {
  const items = Array.isArray(body.recommendations) ? body.recommendations : Array.isArray(body.items) ? body.items : [];
  return {
    recommendations: items.map(normalizeRecommendation)
  };
}

export const recommendationsApi = {
  async suggestMeals(payload: MealRecommendationRequest) {
    const response = await apiRequest<RawMealRecommendationResponse>("/api/recommendations/meals", {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload)
    });

    return normalizeRecommendationResponse(response);
  }
};
