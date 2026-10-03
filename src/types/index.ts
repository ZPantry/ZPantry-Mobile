import type { NavigatorScreenParams } from "@react-navigation/native";
import type { Ingredient } from "@/api/ingredients";
import type { PantryApiItem } from "@/api/pantry";
import type { MealRecommendation, PersonalizedRecommendationOptions } from "@/api/recommendations";
import type { Recipe } from "@/api/recipes";
import type { AdminUser } from "@/api/users";

export type PantryStatus = "safe" | "warning" | "danger";

export type Meal = {
  id: string;
  name: string;
  image: string;
  calories: number | null;
  time: string;
  matchPercent: number | null;
  difficulty: string;
  availableIngredients: string[];
  missingIngredients: string[];
  steps: string[];
};

export type PantryItem = {
  id: string;
  name: string;
  quantity: string;
  location: "Ngan mat" | "Ngan dong" | "Ke bep";
  expiryLabel: string;
  status: PantryStatus;
  icon: string;
  imageUrl?: string | null;
  progress: number;
};

export type NutritionMetric = {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
};

export type MealPlan = {
  id: string;
  time: "Sang" | "Trua" | "Toi";
  title: string;
  note: string;
  icon: string;
};

export type UserProfile = {
  name: string;
  avatar: string;
  goals: string[];
  preferences: string[];
};

export type RootStackParamList = {
  Plan: undefined;
  Login: undefined;
  Onboarding: undefined;
  ProfileSetup: { editing?: boolean } | undefined;
  PantryImport: { method?: "TEXT" | "MENU" | "FOOD_IMAGE" | "RECEIPT" } | undefined;
  QuickAdd: undefined;
  ManualMealSuggestion: undefined;
  CreateRecipe: undefined;
  CookingHistory: undefined;
  AccountSettings: undefined;
  InteractiveGuide: { isReplay?: boolean } | undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  AdminManagement: { initialTab?: "users" | "recipes" | "ingredients"; showBackButton?: boolean } | undefined;
  AdminUserForm: { user: AdminUser };
  AdminRecipeForm: { recipe?: Recipe } | undefined;
  AdminIngredientForm: { ingredient?: Ingredient } | undefined;
  AddIngredient: undefined;
  PantryItemDetail: { pantryItem: PantryApiItem; ingredient?: Ingredient };
  MealRecommendationResults: {
    recommendations: MealRecommendation[];
    mode?: PersonalizedRecommendationOptions["mode"];
    pantryItems: Array<{
      id: string;
      ingredientId: string;
      name: string;
      quantity: number;
      unit: string;
      imageUrl?: string | null;
      source?: "pantry" | "extra";
    }>;
  };
  RecipeDetail: { mealId?: string; recipeId: string };
  TodayMenuItemDetail: { itemId: string };
};

export type TabParamList = {
  Home: undefined;
  Pantry: undefined;
  MealSuggestion: undefined;
  Plan: undefined;
  Profile: undefined;
};
