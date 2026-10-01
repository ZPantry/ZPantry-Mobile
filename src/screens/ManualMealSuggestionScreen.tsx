import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import type { MealRecommendation } from "@/api/recommendations";
import { recommendationsApi } from "@/api/recommendations";
import type { Recipe } from "@/api/recipes";
import { recipesApi } from "@/api/recipes";
import CategoryChip from "@/components/CategoryChip";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getGradientPair } from "@/utils/gradients";
import { getFriendlyErrorMessage } from "@/utils/localize";
import type { RootStackParamList } from "@/types";

type SelectedIngredient = {
  ingredientId: string;
  quantity: number;
  unit: string;
  name: string;
  category: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getIngredientUnit(ingredient: Ingredient) {
  return ingredient.defaultUnit || ingredient.unit || "g";
}

function formatPercent(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function recipeToCandidate(recipe: Recipe) {
  return {
    recipeId: recipe.id,
    recipeName: recipe.name,
    ingredientNames: (recipe.ingredients || []).map(item => item.ingredientName).filter(Boolean),
    instructionText: recipe.instructionText
  };
}

export default function ManualMealSuggestionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const busy = useRef(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [freeText, setFreeText] = useState("");
  const [topK, setTopK] = useState(5);
  const [ingredientResults, setIngredientResults] = useState<Ingredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [recommendations, setRecommendations] = useState<MealRecommendation[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRecipes = useCallback(async () => {
    setIsLoadingRecipes(true);
    setErrorMessage("");
    try {
      setRecipes(await recipesApi.all());
      setCatalogLoaded(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa tải được danh mục công thức.");
    } finally {
      setIsLoadingRecipes(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadRecipes(); }, [loadRecipes]));

  useEffect(() => {
    const keyword = searchText.trim();
    let active = true;

    if (keyword.length < 2) {
      setIngredientResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const page = await ingredientsApi.search(keyword, 1, 10);
        const normalizedKeyword = normalizeText(keyword);
        const filtered = page.data.filter((item) =>
          [item.name, item.normalizedName, item.category].some((field) => normalizeText(field || "").includes(normalizedKeyword))
        );
        if (active) {
          setIngredientResults(filtered);
        }
      } catch (error) {
        if (active) {
          setIngredientResults([]);
          setErrorMessage(error instanceof Error ? error.message : "Chưa tìm được nguyên liệu.");
        }
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchText]);

  const selectedIds = useMemo(() => new Set(selectedIngredients.map((item) => item.ingredientId)), [selectedIngredients]);
  const candidateRecipes = useMemo(() => recipes.map(recipeToCandidate), [recipes]);

  const addIngredient = useCallback(
    (ingredient: Ingredient) => {
      if (selectedIds.has(ingredient.id)) return;

      setSelectedIngredients((current) => [
        ...current,
        {
          ingredientId: ingredient.id,
          name: ingredient.name,
          quantity: 1,
          unit: getIngredientUnit(ingredient),
          category: ingredient.category
        }
      ]);
      setSearchText("");
      setIngredientResults([]);
      setErrorMessage("");
    },
    [selectedIds]
  );

  const updateSelectedIngredient = useCallback((ingredientId: string, patch: Partial<SelectedIngredient>) => {
    setSelectedIngredients((current) => current.map((item) => (item.ingredientId === ingredientId ? { ...item, ...patch } : item)));
  }, []);

  const removeSelectedIngredient = useCallback((ingredientId: string) => {
    setSelectedIngredients((current) => current.filter((item) => item.ingredientId !== ingredientId));
  }, []);

  const freeTextTokens = useMemo(
    () =>
      freeText
        .split(/[\n,;]+/)
        .map((token) => token.trim())
        .filter(Boolean),
    [freeText]
  );

  const requestRecommendations = useCallback(async () => {
    if (busy.current || !catalogLoaded || isLoadingRecipes) return;
    if (!user?.userId) {
      setErrorMessage("Vui lòng đăng nhập trước.");
      return;
    }
    if (selectedIngredients.length === 0 && freeTextTokens.length === 0) {
      setErrorMessage("Chọn hoặc nhập ít nhất một nguyên liệu.");
      return;
    }
    const invalid = selectedIngredients.find((item) => !Number.isFinite(item.quantity) || item.quantity <= 0 || !item.unit.trim());
    if (invalid) {
      setErrorMessage(`${invalid.name}: cần số lượng dương và đơn vị.`);
      return;
    }

    busy.current = true;
    setIsSuggesting(true);
    setErrorMessage("");
    try {
      const response = await recommendationsApi.suggestMeals({
        inputIngredientText: freeText.trim(),
        ingredients: [...selectedIngredients.map((item) => item.name), ...freeTextTokens],
        selectedIngredients: selectedIngredients.map(({ ingredientId, name, quantity, unit }) => ({
          ingredientId,
          name,
          quantity,
          unit: unit.trim()
        })),
        candidateRecipes,
        topK
      });

      setRecommendations(response.recommendations ?? []);
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa tạo được gợi ý. Vui lòng thử lại."));
    } finally {
      busy.current = false;
      setIsSuggesting(false);
    }
  }, [candidateRecipes, freeText, freeTextTokens, selectedIngredients, topK, user?.userId, catalogLoaded, isLoadingRecipes]);

  const recommendationCount = recommendations.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <FlatList
        data={recommendations}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.recipeId}
        contentContainerStyle={{ padding: 20, paddingBottom: 128, gap: 14 }}
        refreshControl={<RefreshControl refreshing={isLoadingRecipes} onRefresh={loadRecipes} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <Pressable
                onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Tabs", { screen: "MealSuggestion" }))}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="chevron-back" size={28} color={colors.primary} />
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }} selectable>
                  Quay lại
                </Text>
              </Pressable>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <PrimaryButton title="Tạo công thức" icon="notebook-edit-outline" variant="soft" onPress={() => navigation.navigate("CreateRecipe")} style={{ minHeight: 42 }} />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }} selectable>
                Gợi ý theo nguyên liệu tự chọn
              </Text>
              <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700", lineHeight: 21 }} selectable>
                Chọn nguyên liệu hoặc nhập tên bên dưới để tìm món phù hợp. Danh sách này không thay đổi nguyên liệu trong tủ.
              </Text>
            </View>

            <View style={{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 12 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }} selectable>
                Nguyên liệu bạn muốn dùng
              </Text>

              <View
                style={{
                  minHeight: 50,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderWidth: 1,
                  borderColor: colors.line,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingHorizontal: 12
                }}
              >
                <Ionicons name="search" size={20} color={colors.primary} />
                <TextInput
                  value={searchText}
                  onChangeText={(value) => {
                    setSearchText(value);
                    setErrorMessage("");
                  }}
                  placeholder="Tìm nguyên liệu, ví dụ: trứng"
                  placeholderTextColor={colors.muted}
                  style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "700", paddingVertical: 0 }}
                />
                {isSearching ? <ActivityIndicator color={colors.primary} size="small" /> : null}
              </View>

              {searchText.trim().length >= 2 ? (
                <View style={{ gap: 8 }}>
                  {ingredientResults.length === 0 && !isSearching ? (
                    <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 19 }} selectable>
                      Không tìm thấy nguyên liệu phù hợp.
                    </Text>
                  ) : (
                    ingredientResults.map((ingredient) => {
                      const isSelected = selectedIds.has(ingredient.id);
                      return (
                        <Pressable
                          key={ingredient.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Thêm ${ingredient.name}`}
                          disabled={isSelected}
                          onPress={() => addIngredient(ingredient)}
                          style={({ pressed }) => ({
                            minHeight: 48,
                            borderRadius: 14,
                            backgroundColor: isSelected ? "rgba(57,217,138,0.16)" : colors.white,
                            borderWidth: 1,
                            borderColor: isSelected ? "rgba(57,217,138,0.42)" : colors.line,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            opacity: pressed ? 0.86 : 1
                          })}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.textDark, fontSize: 14, fontWeight: "900" }} selectable>
                              {ingredient.name}
                            </Text>
                            <Text style={{ color: colors.mutedDark, fontSize: 11, fontWeight: "800", marginTop: 2 }} selectable>
                              {ingredient.category || "Ingredient"} · {getIngredientUnit(ingredient)}
                            </Text>
                          </View>
                          <Ionicons name={isSelected ? "checkmark-circle" : "add-circle"} size={24} color={isSelected ? colors.success : colors.primary} />
                        </Pressable>
                      );
                    })
                  )}
                </View>
              ) : null}

              <TextInput
                value={freeText}
                onChangeText={setFreeText}
                placeholder="Nhập tên nguyên liệu, cách nhau bằng dấu phẩy"
                placeholderTextColor={colors.muted}
                multiline
                style={{
                  minHeight: 72,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.line,
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: "700",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  textAlignVertical: "top",
                  backgroundColor: "rgba(255,255,255,0.10)"
                }}
              />
            </View>

            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
                  Nguyên liệu đã chọn
                </Text>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "900" }} selectable>
                  {selectedIngredients.length} mục
                </Text>
              </View>

              {selectedIngredients.length === 0 ? (
                <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "900" }} selectable>
                    Chưa chọn nguyên liệu
                  </Text>
                </View>
              ) : (
                selectedIngredients.map((item) => (
                  <View key={item.ingredientId} style={{ backgroundColor: colors.white, borderRadius: 14, padding: 12, gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textDark, fontSize: 15, fontWeight: "900" }} selectable>
                          {item.name}
                        </Text>
                        <Text style={{ color: colors.mutedDark, fontSize: 11, fontWeight: "800", marginTop: 2 }} selectable>
                          {item.category || "Ingredient"}
                        </Text>
                      </View>
                      <Pressable onPress={() => removeSelectedIngredient(item.ingredientId)} hitSlop={12}>
                        <Ionicons name="close-circle" size={24} color={colors.danger} />
                      </Pressable>
                    </View>

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <MiniField value={String(item.quantity)} onChangeText={(value) => updateSelectedIngredient(item.ingredientId, { quantity: Number(value.replace(",", ".")) || 0 })} placeholder="Số lượng" keyboardType="decimal-pad" />
                      <MiniField value={item.unit} onChangeText={(value) => updateSelectedIngredient(item.ingredientId, { unit: value })} placeholder="Đơn vị" />
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }} selectable>
                  Số món gợi ý
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }} selectable>
                  Danh mục: {recipes.length}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[5, 10].map((value) => (
                  <CategoryChip key={value} label={`${value}`} active={topK === value} icon="sort" onPress={() => setTopK(value)} />
                ))}
              </View>

              {errorMessage ? (
                <Text style={{ color: "#FFE6E6", fontWeight: "800", lineHeight: 20 }} selectable>
                  {errorMessage}
                </Text>
              ) : null}

              {!catalogLoaded && !isLoadingRecipes ? <PrimaryButton title="Tải lại danh mục" variant="soft" onPress={loadRecipes} /> : null}
              {catalogLoaded && !recipes.length ? <Text style={{ color: colors.muted }}>Danh mục chưa có công thức để gợi ý.</Text> : null}
              <PrimaryButton title={isSuggesting ? "Đang tìm món…" : "Tìm món từ nguyên liệu"} icon="star-outline" disabled={isSuggesting || isLoadingRecipes || !catalogLoaded || !recipes.length} onPress={requestRecommendations} />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
                Món được gợi ý
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }} selectable>
                {recommendationCount} mục
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }} selectable>
              Chưa có gợi ý
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 }} selectable>
              Thêm nguyên liệu rồi nhấn Tìm món từ nguyên liệu.
            </Text>
          </View>
        }
        renderItem={({ item }) => <RecommendationCard recommendation={item} onPress={() => navigation.navigate("RecipeDetail", { recipeId: item.recipeId })} />}
      />
    </SafeAreaView>
  );
}

function RecommendationCard({ recommendation, onPress }: { recommendation: MealRecommendation; onPress: () => void }) {
  const gradient = getGradientPair(recommendation);
  const matchPercent = formatPercent(recommendation.score);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Xem ${recommendation.name}`}
      style={({ pressed }) => ({
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.line,
        opacity: pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }]
      })}
    >
      <View style={{ height: 132, backgroundColor: gradient.start, padding: 14, justifyContent: "flex-end" }}>
        <View style={{ position: "absolute", top: -30, right: -10, width: 110, height: 110, borderRadius: 55, backgroundColor: gradient.end, opacity: 0.35 }} />
        <View style={{ position: "absolute", left: -18, bottom: -24, width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(255,255,255,0.18)" }} />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textDark, fontSize: 22, fontWeight: "900", lineHeight: 28 }} selectable>
              {recommendation.name}
            </Text>
            <Text style={{ color: colors.textDark, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 3, opacity: 0.92 }} selectable>
              {recommendation.description || "Gợi ý từ nguyên liệu bạn đã chọn."}
            </Text>
          </View>
          <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.25)" }}>
            <Text style={{ color: colors.textDark, fontSize: 12, fontWeight: "900" }} selectable>
              {matchPercent}%
            </Text>
          </View>
        </View>
      </View>

      <View style={{ padding: 14, gap: 10 }}>
        <IngredientLine title="Có sẵn" items={recommendation.matchedIngredients} tone="success" />
        <IngredientLine title="Còn thiếu" items={recommendation.missingIngredients} tone="warning" />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Text style={{ color: colors.primaryDark, fontSize: 13, fontWeight: "900" }} selectable>
            Xem chi tiết
          </Text>
          <Ionicons name="arrow-forward-circle" size={24} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

function IngredientLine({ title, items, tone }: { title: string; items: string[]; tone: "success" | "warning" }) {
  const accent = tone === "success" ? colors.success : colors.warning;

  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: colors.textDark, fontSize: 13, fontWeight: "900" }} selectable>
        {title}
      </Text>
      {items.length === 0 ? (
        <Text style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "700" }} selectable>
          Chưa có dữ liệu
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
          {items.map((item) => (
            <View key={item} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: `${accent}22` }}>
              <Text style={{ color: colors.textDark, fontSize: 12, fontWeight: "800" }} selectable>
                {item}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function MiniField({
  value,
  onChangeText,
  placeholder,
  keyboardType = "default"
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "decimal-pad";
}) {
  return (
    <View style={{ flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: "#EEF3EF", borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, justifyContent: "center" }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedDark}
        keyboardType={keyboardType}
        style={{ color: colors.textDark, fontSize: 14, fontWeight: "800" }}
      />
    </View>
  );
}
