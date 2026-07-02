import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReactNode } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Recipe } from "@/api/recipes";
import { recipesApi } from "@/api/recipes";
import CategoryChip from "@/components/CategoryChip";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import type { Meal, RootStackParamList } from "@/types";
import { normalizeRemoteImageUrl } from "@/utils/image";
import { useCallback, useEffect, useState } from "react";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeDetail">;

function recipeToMeal(recipe: Recipe): Meal {
  return {
    id: recipe.id,
    name: recipe.name,
    image: recipe.imageUrl,
    calories: recipe.servingSize ? recipe.servingSize * 160 : 320,
    time: `${recipe.cookingTimeMinutes} phút`,
    matchPercent: recipe.difficulty === "Easy" ? 90 : recipe.difficulty === "Medium" ? 75 : 62,
    difficulty: recipe.difficulty,
    availableIngredients: recipe.description ? [recipe.description] : [],
    missingIngredients: [],
    steps: recipe.instructionText.split(/\d+\.\s*/).map((step) => step.trim()).filter(Boolean)
  };
}

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const [meal, setMeal] = useState<Meal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRecipe = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const recipe = await recipesApi.get(route.params.mealId);
      setMeal(recipeToMeal(recipe));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa tải được chi tiết công thức.");
      setMeal(null);
    } finally {
      setIsLoading(false);
    }
  }, [route.params.mealId]);

  useEffect(() => {
    loadRecipe();
  }, [loadRecipe]);

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
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => ({
              position: "absolute",
              top: 18,
              left: 18,
              width: 46,
              height: 46,
              borderRadius: 17,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.line,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.82 : 1
            })}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        </View>

        <View style={{ padding: 22, gap: 18 }}>
          {errorMessage ? (
            <Text style={{ color: "#FFE6E6", fontWeight: "800", textAlign: "center" }} selectable>
              {errorMessage}
            </Text>
          ) : null}

          {!meal ? (
            <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }} selectable>
                Chưa có chi tiết món ăn
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 }} selectable>
                Kéo xuống để tải lại hoặc quay về danh sách công thức.
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ color: colors.text, fontSize: 31, lineHeight: 38, fontWeight: "900" }} selectable>
                {meal.name}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                <CategoryChip label={meal.difficulty} icon="chef-hat" active />
                <CategoryChip label={meal.time} icon="clock-outline" />
                <CategoryChip label={`${meal.calories} kcal`} icon="fire" />
              </View>

              <RecipeSection title="Mô tả món ăn">
                {meal.availableIngredients.length > 0 ? meal.availableIngredients.map((item) => <Row key={item} icon="information-circle-outline" color={colors.success} text={item} />) : <Row icon="information-circle-outline" color={colors.success} text="Món ăn này chưa có mô tả." />}
              </RecipeSection>

              <RecipeSection title="Cần mua thêm">
                {meal.missingIngredients.length > 0 ? meal.missingIngredients.map((item) => <Row key={item} icon="cart-outline" color={colors.warning} text={item} />) : <Row icon="checkmark-circle" color={colors.success} text="Chưa có danh sách nguyên liệu cần mua." />}
              </RecipeSection>

              <RecipeSection title="Cách nấu">
                {meal.steps.length > 0 ? (
                  meal.steps.map((step, index) => (
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

              <PrimaryButton title="Thêm vào thực đơn hôm nay" icon="calendar-plus" />
              <PrimaryButton title="Tạo danh sách mua sắm" icon="cart" variant="outline" />
            </>
          )}
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
      <Text style={{ color: colors.text, fontWeight: "800", flex: 1 }} selectable>
        {text}
      </Text>
    </View>
  );
}
