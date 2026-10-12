import { userDisplayName } from '@/utils/userProfile';
import FigmaAsset from '@/components/FigmaAsset';
import { homeAssets as assets } from '@/constants/figmaAssets';
import Text from "@/components/AppText";
import type { Ingredient } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import type { PantryApiItem } from "@/api/pantry";
import { pantryApi } from "@/api/pantry";
import { todayMenuApi, type DailyNutrition } from "@/api/todayMenu";
import { recommendationsApi } from "@/api/recommendations";
import type { Recipe } from "@/api/recipes";
import { recipesApi } from "@/api/recipes";
import { BrandPanel, SectionHeading, ActionRow } from "@/components/BrandPanel";
import ExpiryAlertCard from "@/components/ExpiryAlertCard";
import PrimaryButton from "@/components/PrimaryButton";
import MealCard from "@/components/MealCard";
import SearchBar from "@/components/SearchBar";
import { colors, radius, shadows, spacing } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useUnavailableFeature } from "@/context/UnavailableFeatureContext";
import type { Meal } from "@/types";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";
import { getFriendlyErrorMessage, translateDifficulty } from "@/utils/localize";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import ScrollView from "@/components/ScreenScrollView";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuotaWarning } from "@/hooks/useQuotaWarning";
import { useSizeClass } from "@/hooks/useSizeClass";
import { layoutTokens } from "@/constants/responsive";
import AdaptiveGrid from "@/components/AdaptiveGrid";

function recipeToMeal(recipe: Recipe): Meal {
  return {
    id: recipe.id,
    name: recipe.name,
    image: recipe.imageUrl,
    calories: null,
    time: `${recipe.cookingTimeMinutes} phút`,
    matchPercent: null,
    difficulty: translateDifficulty(recipe.difficulty),
    availableIngredients: recipe.description ? [recipe.description] : [],
    missingIngredients: [],
    steps: (recipe.instructionText || "").split(/\d+\.\s*/).map((step) => step.trim()).filter(Boolean)
  };
}

function normalizeSearchText(value?: string | null) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatQuantity(item: PantryApiItem) {
  const quantity = Number(item.quantity ?? 0);
  const quantityText = Number.isFinite(quantity) ? String(quantity) : "0";
  return `${quantityText} ${item.unit || ""}`.trim();
}

function getPantryName(item: PantryApiItem, ingredient?: Ingredient) {
  return ingredient?.name || item.ingredientName || item.note || "Thực phẩm";
}

export default function HomeScreen() {
  const showUnavailable = useUnavailableFeature();
  const warnLowQuota = useQuotaWarning();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const displayName = userDisplayName(user);
  const { width, isCompact, isLandscape, isExpanded } = useSizeClass();
  const insets = useSafeAreaInsets();
  const [showAddMethods, setShowAddMethods] = useState(false);
  const [recipes, setRecipes] = useState<Meal[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryApiItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [nutrition, setNutrition] = useState<DailyNutrition | null>(null);
  const [showNutritionDetail, setShowNutritionDetail] = useState(false);
  const [quickSuggesting, setQuickSuggesting] = useState(false);
  const quickSuggestionLock = useRef(false);
  const loadHome = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const recipePagePromise = recipesApi.list(1, 10);
      const ingredientPagePromise = ingredientsApi.all().then(data => ({ data }));
      const pantryPromise = pantryApi.all();
      const [recipePage, ingredientPage, pantryItems, dailyNutrition] = await Promise.all([recipePagePromise, ingredientPagePromise, pantryPromise, todayMenuApi.dailyNutrition()]);

      setRecipes(recipePage.data.map(recipeToMeal));
      setIngredients(ingredientPage.data);
      setPantryItems(pantryItems);
      setNutrition(dailyNutrition);
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa tải được dữ liệu hôm nay."));

    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHome();
    }, [loadHome])
  );

  const ingredientById = useMemo(() => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])), [ingredients]);
  const pantryWithNames = useMemo(
    () =>
      pantryItems.map((item) => ({
        item,
        ingredient: ingredientById.get(item.ingredientId),
        name: getPantryName(item, ingredientById.get(item.ingredientId))
      })),
    [ingredientById, pantryItems]
  );
  const normalizedKeyword = normalizeSearchText(searchText);
  const filteredPantryItems = useMemo(() => {
    if (!normalizedKeyword) return pantryWithNames.slice(0, 3);
    return pantryWithNames
      .filter(({ item, ingredient, name }) => normalizeSearchText(`${name} ${ingredient?.normalizedName || ""} ${ingredient?.category || ""} ${item.note || ""}`).includes(normalizedKeyword))
      .slice(0, 5);
  }, [normalizedKeyword, pantryWithNames]);
  const filteredRecipes = useMemo(() => {
    if (!normalizedKeyword) return recipes.slice(0, 5);
    return recipes.filter((meal) => normalizeSearchText(`${meal.name} ${meal.availableIngredients.join(" ")}`).includes(normalizedKeyword)).slice(0, 5);
  }, [normalizedKeyword, recipes]);
  const hasSearch = normalizedKeyword.length > 0;

  const quickSuggest = useCallback(async () => {
    if (quickSuggestionLock.current) return;
    quickSuggestionLock.current = true;
    setQuickSuggesting(true);
    try {
      const result = await recommendationsApi.personalized(5, { mode: "AUTO" });
      void warnLowQuota("MEAL_SUGGESTION");
      navigation.navigate("MealRecommendationResults", {
        recommendations: result.recommendations,
        mode: result.mode || "AUTO",
        pantryItems: pantryItems.map(item => ({ id: item.id, ingredientId: item.ingredientId, name: item.ingredientName || "Nguyên liệu", quantity: item.quantity, unit: item.unit, source: "pantry" }))
      });
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa tạo được gợi ý món ăn. Vui lòng thử lại."));
    } finally {
      quickSuggestionLock.current = false;
      setQuickSuggesting(false);
    }
  }, [navigation, pantryItems, warnLowQuota]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadHome} tintColor={colors.primary} />}
        contentContainerStyle={{
          paddingTop: isLandscape ? 18 : isCompact ? 52 : 32,
          paddingBottom: isCompact ? 116 : 76,
          gap: 18,
          maxWidth: layoutTokens.contentMaxWidth,
          width: "100%",
          alignSelf: "center",
          paddingHorizontal: isCompact ? 16 : 24
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: colors.primaryDark, fontSize: 11, fontWeight: "600", letterSpacing: 0.8 }}>GỢI Ý TỪ ĐẦU BẾP AI</Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}>Chào {displayName}! ✨</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>Hôm nay tủ lạnh của bạn có những nguyên liệu tươi ngon nào?</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Thông báo" onPress={() => showUnavailable("Trung tâm thông báo")} style={{ padding: 10 }}>
            <FigmaAsset asset={assets.imgContainer} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Hồ sơ cá nhân" onPress={() => navigation.navigate("Profile")}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
            <FigmaAsset asset={assets.imgImage1} style={{ borderRadius: 16 }} />
          </Pressable>
        </View>
        {errorMessage ? <><ExpiryAlertCard title={errorMessage} tone="danger" /><PrimaryButton title="Thử tải lại" variant="outline" onPress={loadHome} /></> : null}
        {nutrition?.targetCalories != null ? <Pressable accessibilityRole="button" accessibilityLabel="Xem dinh dưỡng hôm nay" accessibilityState={{ expanded: showNutritionDetail }} onPress={() => setShowNutritionDetail(value => !value)}
          style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.82 : 1 })}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}><Ionicons name="flame-outline" size={19} color={colors.primaryDark} /></View>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: colors.text, fontWeight: "700" }}>Hôm nay còn {Math.max(0, nutrition.remainingCalories ?? 0)} kcal</Text><Text style={{ color: colors.muted, fontSize: 12 }}>Chạm để xem chi tiết dinh dưỡng</Text></View>
            <Ionicons name={showNutritionDetail ? "chevron-up" : "chevron-down"} size={20} color={colors.primaryDark} />
          </View>
          {showNutritionDetail ? <View style={{ paddingTop: spacing.sm, borderTopWidth: 1, borderColor: colors.line, gap: 7 }}>
            <Text style={{ color: colors.primaryDark, fontSize: 11, fontWeight: "700" }}>CALO HÔM NAY</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>{nutrition.consumedCalories} / {nutrition.targetCalories} kcal</Text>
            <View style={{ height: 8, borderRadius: 999, overflow: "hidden", backgroundColor: colors.secondary }}><View style={{ width: `${Math.min(100, Math.round((nutrition.consumedCalories / nutrition.targetCalories) * 100))}%`, height: "100%", borderRadius: 999, backgroundColor: colors.primary }} /></View>
            <Text style={{ color: colors.muted, lineHeight: 19 }}>{nutrition.remainingCalories != null && nutrition.remainingCalories < 0 ? `Bạn đã vượt ${Math.abs(nutrition.remainingCalories)} kcal so với mục tiêu.` : `Bạn còn ${nutrition.remainingCalories ?? 0} kcal theo mục tiêu hồ sơ ăn uống.`}</Text>
          </View> : null}
        </Pressable> : null}
        <View style={{ backgroundColor: colors.secondary, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.lg, borderWidth: 1, borderColor: colors.surface, boxShadow: shadows.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <View style={{ width: 56, height: 56, flexShrink: 0, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="fridge-outline" size={30} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}><Text style={{ color: colors.primaryDark, fontSize: 11, fontWeight: '600' }}>QUẢN LÝ THỰC PHẨM</Text>
              <Text style={{ color: colors.text, fontSize: 21, fontWeight: '700' }}>Kho nguyên liệu của {displayName}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>Cập nhật nguyên liệu nhanh chóng để nhận gợi ý món ngon thông minh.</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Thêm nguyên liệu" accessibilityState={{ expanded: showAddMethods }} onPress={() => setShowAddMethods(v => !v)} style={({ pressed }) => ({ backgroundColor: colors.primary, minHeight: 60, padding: spacing.md, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, opacity: pressed ? 0.76 : 1 })}>
            <FigmaAsset asset={assets.imgContainer11} /><Text style={{ color: colors.textDark, fontSize: 20, fontWeight: '700', flexShrink: 1, textAlign: 'center' }}>Thêm nguyên liệu</Text><FigmaAsset asset={assets.imgContainer12} style={{ transform: [{ rotate: showAddMethods ? '180deg' : '0deg' }] }} />
          </Pressable>
          {showAddMethods ? <View style={{ gap: spacing.sm }}>
            <PrimaryButton title="Chọn ảnh / quét thực phẩm" icon="camera-outline" onPress={() => navigation.navigate('PantryImport', { method: 'FOOD_IMAGE' })} />
            <PrimaryButton title="Chọn nguyên liệu thủ công" icon="basket-plus-outline" variant="outline" onPress={() => navigation.navigate('AddIngredient')} />
          </View> : null}
        </View>
        <View style={{ position: 'relative', marginTop: 2 }}>
          <ActionRow asset={assets.imgContainer1} icon="silverware-fork-knife" title="Hôm nay nấu gì?" subtitle={isLoading ? 'Đang kiểm tra tủ của bạn…' : pantryItems.length + ' nguyên liệu trong tủ · khám phá món phù hợp'} onPress={() => navigation.navigate('MealSuggestion')} />
        </View>
        <View style={{ gap: 12 }}>
          <SectionHeading title="Món ngon tuần này 🔥" action="Khám phá" onPress={() => navigation.navigate("MealSuggestion")} />
          <SearchBar placeholder="Tìm món ăn hoặc nguyên liệu" actionLabel="Tìm" value={searchText} onChangeText={setSearchText} onSubmit={() => setSearchText(searchText.trim())} />
          {isLoading && !recipes.length ? <ActivityIndicator color={colors.primary} style={{ padding: 28 }} /> : filteredRecipes.length ?
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
              {filteredRecipes.map(meal => <MealCard key={meal.id} meal={meal} compact onPress={() => navigation.navigate("RecipeDetail", { recipeId: meal.id })} />)}
            </ScrollView> : !errorMessage ? <Text style={{ color: colors.muted, lineHeight: 21 }}>{hasSearch ? "Không tìm thấy công thức phù hợp. Thử từ khóa khác." : "Chưa có công thức. Kéo xuống để tải lại."}</Text> : null}
        </View>
        <View style={{ gap: 12 }}>
          <SectionHeading title="Có sẵn trong tủ" action="Xem kho" onPress={() => navigation.navigate("Pantry")} />
          {isLoading && !pantryItems.length ? <Text style={{ color: colors.muted }}>Đang tải nguyên liệu…</Text> : filteredPantryItems.length ? (
            <AdaptiveGrid
              data={filteredPantryItems}
              minItemWidth={280}
              columns={isCompact ? 1 : 2}
              gap={10}
              renderItem={({ item, ingredient, name }) => (
                <PantrySummaryRow
                  key={item.id}
                  name={name}
                  quantity={formatQuantity(item)}
                  imageUrl={ingredient?.imageUrl}
                  onPress={() => navigation.navigate("PantryItemDetail", { pantryItem: item, ingredient })}
                />
              )}
            />
          ) : !errorMessage ? <ActionRow icon="fridge-outline" title={hasSearch ? "Không tìm thấy nguyên liệu" : "Bắt đầu với tủ thực phẩm của bạn"} subtitle="Thêm những nguyên liệu đang có để tìm món phù hợp." onPress={() => navigation.navigate("AddIngredient")} /> : null}
        </View>
        <ActionRow icon="calendar-outline" title="Lên thực đơn hôm nay" subtitle="Sắp xếp bữa ăn và theo dõi những món đã nấu." onPress={() => navigation.navigate("Plan")} />
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Gợi ý món ăn nhanh bằng AI"
        accessibilityHint="Tự động gợi ý món từ pantry hoặc hồ sơ ăn uống"
        disabled={quickSuggesting}
        onPress={() => void quickSuggest()}
        style={({ pressed }) => ({
          position: "absolute",
          right: isExpanded ? Math.max(20, Math.floor((width - layoutTokens.contentMaxWidth) / 2) + 20) : 18,
          bottom: (isCompact ? 72 : 24) + Math.max(insets.bottom, 12),
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 3,
          borderColor: colors.surface,
          opacity: quickSuggesting ? 0.7 : pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
          boxShadow: "0 5px 16px rgba(184,92,10,0.34)"
        })}
      >
        {quickSuggesting ? <ActivityIndicator color={colors.white} /> : <MaterialCommunityIcons name="chef-hat" size={27} color={colors.white} />}
      </Pressable>
    </SafeAreaView>
  );
}

function PantrySummaryRow({ name, quantity, imageUrl, onPress }: { name: string; quantity: string; imageUrl?: string | null; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết ${name}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 72,
        borderRadius: 14,
        backgroundColor: colors.white,
        padding: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.86 : 1,
        boxShadow: "0 2px 8px rgba(0,48,20,0.06)"
      })}
    >
      <ExpoImage
        source={{ uri: normalizeRemoteImageUrl(imageUrl || FALLBACK_FOOD_IMAGE_URL) }}
        contentFit="cover"
        transition={200}
        style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: colors.secondary }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: colors.textDark, fontSize: 16, fontWeight: "700" }} selectable>
          {name}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "700", marginTop: 3 }} selectable>
          {quantity || "Chưa có số lượng"}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primaryDark} />
    </Pressable>
  );
}
