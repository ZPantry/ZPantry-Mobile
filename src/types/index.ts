import type { NavigatorScreenParams } from "@react-navigation/native";
import type { Ingredient } from "@/api/ingredients";
import type { PantryApiItem } from "@/api/pantry";
import type { Recipe } from "@/api/recipes";

export type PantryStatus = "safe" | "warning" | "danger";

export type Meal = {
  id: string;
  name: string;
  image: string;
  calories: number;
  time: string;
  matchPercent: number;
  difficulty: string;
  availableIngredients: string[];
  missingIngredients: string[];
  steps: string[];
};

export type PantryItem = {
  id: string;
  name: string;
  quantity: string;
  location: "Ngan mat" | "Ngan dong";
  expiryLabel: string;
  status: PantryStatus;
  icon: string;
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
  Login: undefined;
  Onboarding: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  AdminManagement: { initialTab?: "recipes" | "ingredients"; showBackButton?: boolean } | undefined;
  AdminRecipeForm: { recipe?: Recipe } | undefined;
  AdminIngredientForm: { ingredient?: Ingredient } | undefined;
  AddIngredient: undefined;
  PantryItemDetail: { pantryItem: PantryApiItem; ingredient?: Ingredient };
  RecipeDetail: { mealId: string };
};

export type TabParamList = {
  Home: undefined;
  Pantry: undefined;
  MealSuggestion: undefined;
  Plan: undefined;
  Profile: undefined;
};
