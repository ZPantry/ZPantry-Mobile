import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import type { PantryApiItem } from "@/api/pantry";
import { pantryApi } from "@/api/pantry";
import type { Recipe } from "@/api/recipes";
import { recipesApi } from "@/api/recipes";
import ExpiryAlertCard from "@/components/ExpiryAlertCard";
import MealCard from "@/components/MealCard";
import SearchBar from "@/components/SearchBar";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import type { Meal } from "@/types";

const shortcuts = [
  { label: "Thêm nhanh", icon: "plus-circle-outline", target: "AddIngredient" },
  { label: "Gợi ý món", icon: "chef-hat", target: "MealSuggestion" },
  { label: "Lập kế hoạch", icon: "calendar-check", target: "Plan" },
  { label: "Tủ lạnh", icon: "fridge-outline", target: "Pantry" }
];

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

function daysLeft(expiredAt: string) {
  return Math.ceil((new Date(expiredAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const displayName = user?.fullName || "bạn";
  const [recipes, setRecipes] = useState<Meal[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryApiItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadHome = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const recipePagePromise = recipesApi.list(1, 10);
      const ingredientPagePromise = ingredientsApi.list(1, 100);
      const pantryPromise = pantryApi.list();
      const [recipePage, ingredientPage, pantryItems] = await Promise.all([recipePagePromise, ingredientPagePromise, pantryPromise]);

      setRecipes(recipePage.data.map(recipeToMeal));
      setIngredients(ingredientPage.data);
      setPantryItems(pantryItems);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa tải được dữ liệu hôm nay.");
      setRecipes([]);
      setIngredients([]);
      setPantryItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  const ingredientById = useMemo(() => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])), [ingredients]);
  const expiringItem = useMemo(() => pantryItems.slice().sort((left, right) => daysLeft(left.expiredAt) - daysLeft(right.expiredAt))[0], [pantryItems]);
  const expiringIngredient = expiringItem ? ingredientById.get(expiringItem.ingredientId) : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadHome} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 22, paddingBottom: 118, gap: 18 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="person-circle-outline" size={42} color={colors.background} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: "900" }} selectable>
                Chào {displayName}!
              </Text>
              <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700", marginTop: 2 }} selectable>
                Hôm nay bạn muốn nấu món gì?
              </Text>
            </View>
          </View>
          <Pressable
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.line,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            <View style={{ position: "absolute", top: 4, right: 5, width: 13, height: 13, borderRadius: 7, backgroundColor: colors.danger }} />
          </Pressable>
        </View>

        <SearchBar placeholder="Tìm món ăn hoặc nguyên liệu" actionLabel="Tìm" />

        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          {shortcuts.map((item) => (
            <Pressable key={item.label} onPress={() => navigation.navigate(item.target)} style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 7, opacity: pressed ? 0.75 : 1 })}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.line,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <MaterialCommunityIcons name={item.icon as never} size={25} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text, fontSize: 11, fontWeight: "800", textAlign: "center" }} selectable>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {errorMessage ? <ExpiryAlertCard title={errorMessage} tone="danger" /> : null}

        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatCard icon="fridge-outline" value={`${pantryItems.length}`} label="Thực phẩm trong tủ" />
          <StatCard icon="notebook-outline" value={`${recipes.length}`} label="Công thức sẵn sàng" alignRight />
        </View>

        {expiringItem ? (
          <ExpiryAlertCard title={`${expiringIngredient?.name || "Một thực phẩm"} còn ${Math.max(0, daysLeft(expiringItem.expiredAt))} ngày sử dụng. Ưu tiên dùng sớm nhé.`} tone={daysLeft(expiringItem.expiredAt) <= 1 ? "danger" : "warning"} />
        ) : (
          <View style={{ backgroundColor: colors.card, borderRadius: 16, borderCurve: "continuous", padding: 16, borderWidth: 1, borderColor: colors.line, gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }} selectable>
              Tủ của bạn đang trống
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 }} selectable>
              Thêm nguyên liệu để app gợi ý món phù hợp hơn.
            </Text>
          </View>
        )}

        <View style={{ gap: 12 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
            Gợi ý công thức
          </Text>
          {recipes.length === 0 ? (
            <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }} selectable>
                Chưa có công thức để hiển thị
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 }} selectable>
                Kéo xuống để tải lại khi có công thức mới.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {recipes.slice(0, 5).map((meal) => (
                <MealCard key={meal.id} meal={meal} compact onPress={() => navigation.navigate("RecipeDetail", { mealId: meal.id })} />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label, alignRight = false }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string; label: string; alignRight?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 8, alignItems: alignRight ? "flex-end" : "flex-start" }}>
      <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: "900", fontVariant: ["tabular-nums"] }} selectable>
        {value}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800", textAlign: alignRight ? "right" : "left" }} selectable>
        {label}
      </Text>
    </View>
  );
}
