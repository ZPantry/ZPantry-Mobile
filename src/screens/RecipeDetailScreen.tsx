import DateField from "@/components/DateField";
import Text from "@/components/AppText";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, TextInput, View } from "react-native";
import ScrollView from "@/components/ScreenScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MealIngredientCheckResponse } from "@/api/recommendations";
import { recommendationsApi } from "@/api/recommendations";
import type { Recipe } from "@/api/recipes";
import { pantryApi, type PantryApiItem } from "@/api/pantry";
import { compareRecipePantry } from "@/utils/recipePantry";
import SelectField from "@/components/SelectField";
import RecommendationFeedback from "@/components/RecommendationFeedback";
import { recipesApi } from "@/api/recipes";
import { allergens } from "@/api/profile";
import { todayMenuApi } from "@/api/todayMenu";
import CategoryChip from "@/components/CategoryChip";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { useToast } from "@/context/ToastContext";
import type { Meal, RootStackParamList } from "@/types";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";
import { getCurrentMealType, getFriendlyErrorMessage, translateDifficulty } from "@/utils/localize";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeDetail">;

function recipeToMeal(recipe: Recipe): Meal {
  return {
    id: recipe.id,
    name: recipe.name,
    image: recipe.imageUrl || FALLBACK_FOOD_IMAGE_URL,
    calories: null,
    time: `${recipe.cookingTimeMinutes} phút`,
    matchPercent: null,
    difficulty: translateDifficulty(recipe.difficulty),
    availableIngredients: recipe.description ? [recipe.description] : [],
    missingIngredients: [],
    steps: (recipe.instructionText || "").split(/\d+\.\s*/).map((step) => step.trim()).filter(Boolean)
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
  const [plannedDate, setPlannedDate] = useState(formatDateKey());
  const [meal, setMeal] = useState<Meal | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredientCheck, setIngredientCheck] = useState<MealIngredientCheckResponse | null>(null);
  const [pantry, setPantry] = useState<PantryApiItem[] | null>(null);
  const [pantryError, setPantryError] = useState("");
  const [servings, setServings] = useState("");
  const [mealType, setMealType] = useState(() => ({ "Bữa sáng": "BREAKFAST", "Bữa trưa": "LUNCH", "Bữa tối": "DINNER" }[getCurrentMealType()] || "DINNER"));
  const [menuNote, setMenuNote] = useState("");
  const [missingAdvice, setMissingAdvice] = useState<string[] | null>(null);
  const [adviceBusy, setAdviceBusy] = useState(false);
  const [adviceError, setAdviceError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingToToday, setIsAddingToToday] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRecipe = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [recipeResult, checkResult, pantryResult] = await Promise.allSettled([
        recipesApi.get(route.params.recipeId),
        route.params.mealId ? recommendationsApi.checkMealIngredients(route.params.mealId) : Promise.resolve(null),
        pantryApi.all()
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
      if (pantryResult.status === "fulfilled") { setPantry(pantryResult.value); setPantryError(""); }
      else { setPantryError(getFriendlyErrorMessage(pantryResult.reason, "Chưa tải được tủ để đối chiếu nguyên liệu.")); }

      if (recipeResult.status === "rejected") {
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
  }, [route.params.mealId, route.params.recipeId]);

  useEffect(() => {
    loadRecipe();
  }, [loadRecipe]);

  const title = meal?.name || "Chi tiết món ăn";
  const steps = useMemo(() => meal?.steps || [], [meal?.steps]);
  const portionCount = Number(servings || recipe?.servingSize || 1);
  const comparison = useMemo(() => recipe && pantry ? compareRecipePantry(recipe, pantry, portionCount) : ingredientCheck, [recipe, pantry, portionCount, ingredientCheck]);
  const suggestMissing = async () => {
    if (!recipe || !pantry || adviceBusy) return;
    setAdviceBusy(true); setAdviceError(""); setMissingAdvice(null);
    try {
      const availableIds = new Set(compareRecipePantry(recipe, pantry, portionCount).availableIngredients.map(i => i.ingredientId));
      const result = await recommendationsApi.suggestMissing({ recipeId: recipe.id, recipeName: recipe.name,
        requiredIngredients: (recipe.ingredients || []).map(i => i.ingredientName),
        userIngredients: (recipe.ingredients || []).filter(i => availableIds.has(i.ingredientId)).map(i => i.ingredientName) });
      setMissingAdvice(result.map(i => i.name));
    } catch (e) { setAdviceError(getFriendlyErrorMessage(e, "Chưa gợi ý được nguyên liệu.")); }
    finally { setAdviceBusy(false); }
  };

  const addToTodayMenu = useCallback(async () => {
    if (!recipe || isAddingToToday) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plannedDate) || Number.isNaN(Date.parse(plannedDate)) || new Date(plannedDate).toISOString().slice(0,10) !== plannedDate) { toast.show("Vui lòng chọn đủ ngày, tháng và năm hợp lệ.", "danger"); return; }

    setIsAddingToToday(true);
    try {
      const item = await todayMenuApi.add({
        recipeId: recipe.id,
        mealName: recipe.name,
        mealId: route.params.mealId,
        mealType,
        servingSize: portionCount,
        plannedDate,
        note: menuNote.trim()
      });

      toast.show("Đã thêm món vào thực đơn.");
      navigation.navigate("Plan", { date: item.plannedDate || plannedDate, refreshKey: Date.now() });
    } catch (error) {
      toast.show(getFriendlyErrorMessage(error, "Chưa thêm được món vào thực đơn."), "danger");
    } finally {
      setIsAddingToToday(false);
    }
  }, [navigation, recipe, toast, plannedDate, isAddingToToday, mealType, portionCount, menuNote, route.params.mealId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["left", "right", "bottom"]}>
      <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadRecipe} tintColor={colors.primary} />} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 34 }}>
        <View>
          {meal?.image ? (
            <Image source={{ uri: normalizeRemoteImageUrl(meal.image) }} style={{ width: "100%", height: 280, backgroundColor: colors.secondary }} />
          ) : (
            <View style={{ width: "100%", height: 220, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="restaurant-outline" size={54} color={colors.primary} />
            </View>
          )}

        </View>

        <View style={{ padding: 22, gap: 18 }}>
          {errorMessage ? (
            <Text style={{ color: colors.danger, fontWeight: "600", textAlign: "center" }} selectable>
              {errorMessage}
            </Text>
          ) : null}

          <Text style={{ color: colors.text, fontSize: 31, lineHeight: 38, fontWeight: "700" }} selectable>
            {title}
          </Text>

          {meal ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <CategoryChip label={meal.difficulty} icon="chef-hat" active />
              <CategoryChip label={meal.time} icon="clock-outline" />
            </View>
          ) : null}

          {recipe?.ingredients?.length ? <RecipeSection title="Thành phần công thức">
            {recipe.ingredients.map((i) => <Row key={i.ingredientId} icon="nutrition-outline" color={colors.primary} text={`${i.ingredientName} · ${Number((i.quantity * portionCount / (recipe.servingSize || 1)).toFixed(4))} ${i.unit}`} />)}
          </RecipeSection> : null}
          <RecipeSection title="Thông tin dị ứng">
            <Text style={{ color: colors.text, lineHeight: 22 }}>{recipe?.allergens?.length
              ? recipe.allergens.map((v) => allergens.find((a) => a.value === v)?.label || v).join(", ")
              : "Chưa có chất gây dị ứng được khai báo. Điều này không bảo đảm món không gây dị ứng."}</Text>
          </RecipeSection>
          <RecipeSection title="Nguyên liệu đã có">
            {comparison?.availableIngredients.length ? (
              comparison.availableIngredients.map((item) => <Row key={`${item.ingredientId || item.name}-available`} icon="checkmark-circle" color={colors.success} text={`${item.name}${statusLabel(item.quantity, item.unit)}`} />)
            ) : (
              <Row icon="information-circle-outline" color={colors.primary} text="Chưa có dữ liệu nguyên liệu đã có trong tủ." />
            )}
          </RecipeSection>
          {pantryError ? <View style={{ gap: 10 }}><Text accessibilityRole="alert" style={{ color: colors.danger }}>{pantryError}</Text><PrimaryButton title="Thử tải lại tủ" variant="outline" disabled={isLoading} onPress={loadRecipe} /></View> : null}

          <RecipeSection title="Cần mua thêm">
            {comparison?.missingIngredients.length ? (
              comparison.missingIngredients.map((item) => <Row key={`${item.ingredientId || item.name}-missing`} icon="cart-outline" color={colors.warning} text={`${item.name}${statusLabel(item.requiredQuantity, item.unit, "missing")}`} />)
            ) : (
              <Row icon="information-circle-outline" color={colors.primary} text={comparison ? "Không thấy nguyên liệu còn thiếu cho món này." : "Chưa có kết quả đối chiếu với tủ. Kiểm tra thành phần công thức trước khi nấu."} />
            )}
            {comparison?.note ? <Row icon="information-circle-outline" color={colors.primary} text={comparison.note} /> : null}
            {recipe?.ingredients?.length ? <PrimaryButton title="Gợi ý nguyên liệu cần mua" variant="soft" loading={adviceBusy} disabled={!pantry} onPress={suggestMissing} /> : null}
            {adviceError ? <Text selectable accessibilityRole="alert" style={{ color: colors.danger }}>{adviceError}</Text> : null}
            {missingAdvice !== null ? <Text selectable accessibilityLiveRegion="polite" style={{ color: colors.muted, lineHeight: 22 }}>{missingAdvice.length ? `Gợi ý theo tên: ${missingAdvice.join(", ")}. Đối chiếu lượng cần mua ở trên.` : "Không có tên nguyên liệu cần bổ sung. Kiểm tra lượng còn thiếu ở trên để mua đủ theo khẩu phần."}</Text> : null}
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
                        <Text style={{ color: colors.white, fontWeight: "700" }} selectable>
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

              <RecipeSection title="Lên thực đơn">
                <DateField label="Ngày lên thực đơn" value={plannedDate} onChange={setPlannedDate} disabled={isAddingToToday} />
                <SelectField label="Bữa ăn" value={mealType} onValueChange={setMealType} disabled={isAddingToToday} options={[{ label: "Bữa sáng", value: "BREAKFAST" }, { label: "Bữa trưa", value: "LUNCH" }, { label: "Bữa tối", value: "DINNER" }, { label: "Bữa phụ", value: "SNACK" }]} />
                <SelectField label="Khẩu phần" value={String(portionCount)} onValueChange={setServings} disabled={isAddingToToday} options={[...new Set([1, 2, 3, 4, 6, 8, recipe?.servingSize || 1])].sort((a,b) => a-b).map(n => ({ value: String(n), label: `${n} người` }))} />
                <TextInput accessibilityLabel="Ghi chú thực đơn" value={menuNote} onChangeText={setMenuNote} editable={!isAddingToToday} multiline placeholder="Ghi chú cho bữa ăn (không bắt buộc)" placeholderTextColor={colors.muted} style={{ color: colors.text, padding: 12, minHeight: 70, backgroundColor: colors.input, borderRadius: 10 }} />
                <PrimaryButton title="Thêm vào thực đơn" icon="calendar-plus" loading={isAddingToToday} onPress={addToTodayMenu} />
              </RecipeSection>
              <RecommendationFeedback recommendationId={route.params.recommendationId} recipeId={route.params.recipeId} />
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
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }} selectable>
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
      <Text style={{ color: colors.text, fontWeight: "600", flex: 1, lineHeight: 21 }} selectable>
        {text}
      </Text>
    </View>
  );
}
