import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Recipe } from "@/api/recipes";
import { recipesApi } from "@/api/recipes";
import CategoryChip from "@/components/CategoryChip";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import type { RootStackParamList } from "@/types";
import { getGradientPair } from "@/utils/gradients";

type Props = NativeStackScreenProps<RootStackParamList, "RecipeDetail">;

function splitInstructions(text?: string | null) {
  if (!text?.trim()) return [];
  const normalized = text
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=\.)\s+|\d+\.\s+/))
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized;
}

function formatDifficulty(value?: string | null) {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRecipe = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const result = await recipesApi.get(route.params.mealId);
      setRecipe(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load recipe detail.");
      setRecipe(null);
    } finally {
      setIsLoading(false);
    }
  }, [route.params.mealId]);

  useEffect(() => {
    loadRecipe();
  }, [loadRecipe]);

  const gradient = useMemo(() => getGradientPair(recipe || { id: route.params.mealId, name: "Recipe" }), [recipe, route.params.mealId]);
  const ingredients = recipe?.ingredients || [];
  const steps = splitInstructions(recipe?.instructionText);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadRecipe} tintColor={colors.primary} />}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 36 }}
      >
        <View style={{ height: 300, backgroundColor: gradient.start, overflow: "hidden" }}>
          {recipe?.imageUrl ? <Image source={{ uri: recipe.imageUrl }} style={{ width: "100%", height: "100%", opacity: 0.8 }} /> : null}
          <View style={{ position: "absolute", top: -30, right: -18, width: 150, height: 150, borderRadius: 75, backgroundColor: gradient.end, opacity: 0.32 }} />
          <View style={{ position: "absolute", left: -24, bottom: -28, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.18)" }} />

          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => ({
              position: "absolute",
              top: 18,
              left: 18,
              width: 46,
              height: 46,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.28)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.24)",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.84 : 1
            })}
          >
            <Ionicons name="chevron-back" size={26} color={colors.textDark} />
          </Pressable>

          <View style={{ position: "absolute", left: 18, right: 18, bottom: 18, gap: 8 }}>
            <Text style={{ color: colors.textDark, fontSize: 30, lineHeight: 36, fontWeight: "900" }} selectable>
              {recipe?.name || "Recipe detail"}
            </Text>
            <Text style={{ color: colors.textDark, fontSize: 13, fontWeight: "700", lineHeight: 19, opacity: 0.92 }} selectable>
              {recipe?.description || "Recipe prepared from backend catalog."}
            </Text>
            {recipe ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                <CategoryChip label={`${recipe.cookingTimeMinutes || 0} min`} icon="clock-outline" active />
                <CategoryChip label={formatDifficulty(recipe.difficulty)} icon="chef-hat" />
                <CategoryChip label={`${recipe.servingSize || 1} servings`} icon="account-group-outline" />
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          {isLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.muted, fontWeight: "700" }} selectable>
                Loading recipe...
              </Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14 }}>
              <Text style={{ color: "#FFE2E2", fontWeight: "800", lineHeight: 20 }} selectable>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {!recipe ? (
            <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }} selectable>
                No recipe found
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 }} selectable>
                Pull to refresh or go back to the recipe list.
              </Text>
            </View>
          ) : (
            <>
              <Section title="Recipe info">
                <InfoRow icon="information-circle-outline" text={recipe.sourceType || "manual"} />
                <InfoRow icon="timer-outline" text={`${recipe.cookingTimeMinutes || 0} minutes`} />
                <InfoRow icon="layers-outline" text={`${ingredients.length} ingredients`} />
              </Section>

              <Section title="Ingredients">
                {ingredients.length === 0 ? (
                  <EmptyRow icon="basket-outline" text="No ingredient data available." />
                ) : (
                  ingredients.map((item) => (
                    <View key={`${item.ingredientId}-${item.ingredientName || item.note}`} style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, padding: 12, gap: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <Text style={{ color: colors.textDark, fontSize: 15, fontWeight: "900", flex: 1 }} selectable>
                          {item.ingredientName || item.ingredientId}
                        </Text>
                        <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: item.isRequired ? "rgba(57,217,138,0.16)" : "rgba(244,162,28,0.16)" }}>
                          <Text style={{ color: colors.textDark, fontSize: 11, fontWeight: "900" }} selectable>
                            {item.isRequired ? "Required" : "Optional"}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "700" }} selectable>
                        {item.quantity} {item.unit}
                        {item.note ? ` · ${item.note}` : ""}
                      </Text>
                    </View>
                  ))
                )}
              </Section>

              <Section title="Instructions">
                {steps.length === 0 ? (
                  <EmptyRow icon="document-text-outline" text="No instruction text available." />
                ) : (
                  steps.map((step, index) => (
                    <View key={`${index}-${step}`} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
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
                )}
              </Section>

              <View style={{ gap: 10 }}>
                <PrimaryButton title="Create similar recipe" icon="notebook-edit-outline" onPress={() => navigation.navigate("CreateRecipe")} />
                <PrimaryButton title="Back to meals" icon="arrow-left" variant="outline" onPress={() => navigation.goBack()} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }} selectable>
        {title}
      </Text>
      {children}
    </View>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={{ color: colors.text, fontWeight: "800", flex: 1 }} selectable>
        {text}
      </Text>
    </View>
  );
}

function EmptyRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Ionicons name={icon} size={20} color={colors.muted} />
      <Text style={{ color: colors.muted, fontWeight: "700", flex: 1, lineHeight: 20 }} selectable>
        {text}
      </Text>
    </View>
  );
}
