import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MealIngredientCheckResponse } from "@/api/recommendations";
import { recommendationsApi } from "@/api/recommendations";
import type { Recipe } from "@/api/recipes";
import { recipesApi } from "@/api/recipes";
import { todayMenuApi } from "@/api/todayMenu";
import AppBackButton from "@/components/AppBackButton";
import CategoryChip from "@/components/CategoryChip";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { useToast } from "@/context/ToastContext";
import type { Meal, RootStackParamList } from "@/types";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";
import { getCurrentMealType, getFriendlyErrorMessage, translateDifficulty, translateRecommendationText } from "@/utils/localize";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeDetail">;

function recipeToMeal(recipe: Recipe): Meal {
  return {
    id: recipe.id,
    name: recipe.name,
    image: recipe.imageUrl || FALLBACK_FOOD_IMAGE_URL,
    calories: recipe.servingSize ? recipe.servingSize * 160 : 320,
    time: `${recipe.cookingTimeMinutes} phút`,
    matchPercent: recipe.difficulty === "Easy" ? 90 : recipe.difficulty === "Medium" ? 75 : 62,
    difficulty: translateDifficulty(recipe.difficulty),
    availableIngredients: recipe.description ? [recipe.description] : [],
    missingIngredients: [],
    steps: recipe.instructionText.split(/\d+\.\s*/).map((step) => step.trim()).filter(Boolean)
  };
}

function statusLabel(quantity?: number, unit?: string, mode: "available" | "missing" = "available") {
  if (!quantity) return "";
  return mode === "missing" ? ` - cần ${quantity} ${unit || ""}` : ` - có ${quantity} ${unit || ""}`;
}

function formatDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const toast = useToast();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredientCheck, setIngredientCheck] = useState<MealIngredientCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingToToday, setIsAddingToToday] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRecipe = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [recipeResult, checkResult] = await Promise.allSettled([
        recipesApi.get(route.params.mealId),
        recommendationsApi.checkMealIngredients(route.params.mealId)
      ]);

      if (recipeResult.status === "fulfilled") {
        setRecipe(recipeResult.value);
        setMeal(recipeToMeal(recipeResult.value));
      } else {
        setRecipe(null);
        setMeal(null);
      }

      if (checkResult.status === "fulfilled") {
        setIngredientCheck(checkResult.value);
      } else {
        setIngredientCheck(null);
      }

      if (recipeResult.status === "rejected" && checkResult.status === "rejected") {
        throw recipeResult.reason;
      }
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa tải được chi tiết món ăn."));
      setRecipe(null);
      setMeal(null);
      setIngredientCheck(null);
    } finally {
      setIsLoading(false);
    }
  }, [route.params.mealId]);

  useEffect(() => {
    loadRecipe();
  }, [loadRecipe]);

  const title = meal?.name || "Chi tiết món ăn";
  const steps = useMemo(() => meal?.steps || [], [meal?.steps]);

  const addToTodayMenu = useCallback(async () => {
    if (!recipe) return;

    setIsAddingToToday(true);
    try {
      const item = await todayMenuApi.add({
        recipeId: recipe.id,
        mealName: recipe.name,
        mealType: getCurrentMealType(),
        servingSize: recipe.servingSize || 1,
        plannedDate: formatDateKey(),
        note: ""
      });

      toast.show("Đã thêm món vào thực đơn hôm nay.");
      navigation.navigate("TodayMenuItemDetail", { itemId: item.id });
    } catch (error) {
      toast.show(getFriendlyErrorMessage(error, "Chưa thêm được món vào thực đơn."), "danger");
    } finally {
      setIsAddingToToday(false);
    }
  }, [navigation, recipe, toast]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadRecipe} tintColor={colors.primary} />} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 34 }}>
        <View>
          {meal?.image ? (
            <Image source={{ uri: normalizeRemoteImageUrl(meal.image) }} style={{ width: "100%", height: 280, backgroundColor: colors.secondary }} />
          ) : (
            <View style={{ width: "100%", height: 220, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="restaurant-outline" size={54} color={colors.primary} />
            </View>
          )}
          <AppBackButton
            variant="floating"
            onPress={() => navigation.goBack()}
            style={{
              position: "absolute",
              top: 18,
              left: 18
            }}
          />
        </View>

        <View style={{ padding: 22, gap: 18 }}>
          {errorMessage ? (
            <Text style={{ color: "#FFE6E6", fontWeight: "800", textAlign: "center" }} selectable>
              {errorMessage}
            </Text>
          ) : null}

          <Text style={{ color: colors.text, fontSize: 31, lineHeight: 38, fontWeight: "900" }} selectable>
            {title}
          </Text>

          {meal ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <CategoryChip label={meal.difficulty} icon="chef-hat" active />
              <CategoryChip label={meal.time} icon="clock-outline" />
              <CategoryChip label={`${meal.calories} kcal`} icon="fire" />
            </View>
          ) : null}

          <RecipeSection title="Nguyên liệu đã có">
            {ingredientCheck?.availableIngredients.length ? (
              ingredientCheck.availableIngredients.map((item) => <Row key={`${item.ingredientId || item.name}-available`} icon="checkmark-circle" color={colors.success} text={`${item.name}${statusLabel(item.quantity, item.unit)}`} />)
            ) : (
              <Row icon="information-circle-outline" color={colors.primary} text="Chưa có dữ liệu nguyên liệu đã có trong tủ." />
            )}
          </RecipeSection>

          <RecipeSection title="Cần mua thêm">
            {ingredientCheck?.missingIngredients.length ? (
              ingredientCheck.missingIngredients.map((item) => <Row key={`${item.ingredientId || item.name}-missing`} icon="cart-outline" color={colors.warning} text={`${item.name}${statusLabel(item.requiredQuantity, item.unit, "missing")}`} />)
            ) : (
              <Row icon="checkmark-circle" color={colors.success} text="Không thấy nguyên liệu còn thiếu cho món này." />
            )}
            {ingredientCheck?.note ? <Row icon="sparkles-outline" color={colors.primary} text={translateRecommendationText(ingredientCheck.note)} /> : null}
          </RecipeSection>

          {meal ? (
            <>
              <RecipeSection title="Mô tả món ăn">
                {meal.availableIngredients.length > 0 ? meal.availableIngredients.map((item) => <Row key={item} icon="information-circle-outline" color={colors.success} text={item} />) : <Row icon="information-circle-outline" color={colors.success} text="Món ăn này chưa có mô tả." />}
              </RecipeSection>

              <RecipeSection title="Cách nấu">
                {steps.length > 0 ? (
                  steps.map((step, index) => (
                    <View key={`${index}-${step}`} style={{ flexDirection: "row", gap: 12 }}>
                      <View style={{ width: 30, height: 30, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: colors.white, fontWeight: "900" }} selectable>
                          {index + 1}
                        </Text>
                      </View>
                      <Text style={{ flex: 1, color: colors.text, fontWeight: "700", lineHeight: 22 }} selectable>
                        {step}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Row icon="reader-outline" color={colors.primary} text="Món ăn này chưa có hướng dẫn nấu." />
                )}
              </RecipeSection>

              <PrimaryButton title={isAddingToToday ? "Đang thêm..." : "Thêm vào thực đơn hôm nay"} icon="calendar-plus" onPress={addToTodayMenu} />
              <PrimaryButton title="Tạo danh sách mua sắm" icon="cart" variant="outline" />
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RecipeSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, borderCurve: "continuous", padding: 18, gap: 14, borderWidth: 1, borderColor: colors.line }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ icon, color, text }: { icon: keyof typeof Ionicons.glyphMap; color: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={{ color: colors.text, fontWeight: "800", flex: 1, lineHeight: 21 }} selectable>
        {text}
      </Text>
    </View>
  );
}
