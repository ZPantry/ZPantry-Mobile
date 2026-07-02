import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import type { MealRecommendation, SelectedIngredientPayload } from "@/api/recommendations";
import { recommendationsApi } from "@/api/recommendations";
import type { Recipe } from "@/api/recipes";
import { recipesApi } from "@/api/recipes";
import CategoryChip from "@/components/CategoryChip";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getGradientPair } from "@/utils/gradients";

type SelectedIngredient = SelectedIngredientPayload & {
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
  const normalized = score > 1 ? score : score * 100;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function recipeToCandidate(recipe: Recipe) {
  return {
    id: recipe.id,
    name: recipe.name,
    gradient: getGradientPair(recipe)
  };
}

export default function MealSuggestionScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

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
    try {
      const page = await recipesApi.list(1, 100);
      setRecipes(page.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Cannot load recipe catalog.");
      setRecipes([]);
    } finally {
      setIsLoadingRecipes(false);
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

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
          setErrorMessage(error instanceof Error ? error.message : "Cannot search ingredients.");
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
  const candidateRecipes = useMemo(() => recipes.map((recipe) => recipe.id), [recipes]);

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
    if (!user?.userId) {
      setErrorMessage("Please sign in first.");
      return;
    }
    if (selectedIngredients.length === 0 && freeTextTokens.length === 0) {
      setErrorMessage("Add at least one ingredient or free text.");
      return;
    }
    const invalid = selectedIngredients.find((item) => !Number.isFinite(item.quantity) || item.quantity <= 0 || !item.unit.trim());
    if (invalid) {
      setErrorMessage(`${invalid.name}: quantity and unit are required.`);
      return;
    }

    setIsSuggesting(true);
    setErrorMessage("");
    try {
      const response = await recommendationsApi.suggestMeals({
        userId: user.userId,
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
      setRecommendations([]);
      setErrorMessage(error instanceof Error ? error.message : "Unable to generate meal suggestions.");
    } finally {
      setIsSuggesting(false);
    }
  }, [candidateRecipes, freeText, freeTextTokens, selectedIngredients, topK, user?.userId]);

  const recommendationCount = recommendations.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.recipeId}
        contentContainerStyle={{ padding: 20, paddingBottom: 128, gap: 14 }}
        refreshControl={<RefreshControl refreshing={isSuggesting || isLoadingRecipes} onRefresh={() => Promise.all([loadRecipes(), requestRecommendations()])} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <Pressable
                onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"))}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="chevron-back" size={28} color={colors.primary} />
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }} selectable>
                  Back
                </Text>
              </Pressable>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <PrimaryButton title="Create" icon="notebook-edit-outline" variant="soft" onPress={() => navigation.navigate("CreateRecipe")} style={{ minHeight: 42 }} />
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }} selectable>
                Smart meal suggestions
              </Text>
              <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700", lineHeight: 21 }} selectable>
                Pick ingredients, sync the real recipe catalog, and let the AI service rank what fits best.
              </Text>
            </View>

            <View style={{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 12 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }} selectable>
                Ingredients in your hand
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
                  placeholder="Search ingredient, e.g. egg"
                  placeholderTextColor={colors.muted}
                  style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "700", paddingVertical: 0 }}
                />
                {isSearching ? <ActivityIndicator color={colors.primary} size="small" /> : null}
              </View>

              {searchText.trim().length >= 2 ? (
                <View style={{ gap: 8 }}>
                  {ingredientResults.length === 0 && !isSearching ? (
                    <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 19 }} selectable>
                      No matching ingredient found.
                    </Text>
                  ) : (
                    ingredientResults.map((ingredient) => {
                      const isSelected = selectedIds.has(ingredient.id);
                      return (
                        <Pressable
                          key={ingredient.id}
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
                placeholder="Add free text ingredients separated by commas"
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
                  Selected ingredients
                </Text>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "900" }} selectable>
                  {selectedIngredients.length} items
                </Text>
              </View>

              {selectedIngredients.length === 0 ? (
                <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "900" }} selectable>
                    No selected ingredient yet
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
                      <MiniField value={String(item.quantity)} onChangeText={(value) => updateSelectedIngredient(item.ingredientId, { quantity: Number(value.replace(",", ".")) || 0 })} placeholder="Qty" keyboardType="decimal-pad" />
                      <MiniField value={item.unit} onChangeText={(value) => updateSelectedIngredient(item.ingredientId, { unit: value })} placeholder="Unit" />
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }} selectable>
                  Top results
                </Text>
                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }} selectable>
                  catalog: {recipes.length}
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

              <PrimaryButton title={isSuggesting ? "Suggesting..." : "Find meals"} icon="star-outline" onPress={requestRecommendations} />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
                Recommendations
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }} selectable>
                {recommendationCount} items
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }} selectable>
              No recommendation yet
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 }} selectable>
              Add ingredients and tap Find meals.
            </Text>
          </View>
        }
        renderItem={({ item }) => <RecommendationCard recommendation={item} onPress={() => navigation.navigate("RecipeDetail", { mealId: item.recipeId })} />}
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
              {recommendation.description || "Suggested from your ingredient set."}
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
        <IngredientLine title="Matched" items={recommendation.matchedIngredients} tone="success" />
        <IngredientLine title="Missing" items={recommendation.missingIngredients} tone="warning" />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Text style={{ color: colors.primaryDark, fontSize: 13, fontWeight: "900" }} selectable>
            Open details
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
          No data
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
    <View style={{ flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, justifyContent: "center" }}>
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
