import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import { recipesApi, type RecipeIngredientPayload, type RecipePayload } from "@/api/recipes";
import CategoryChip from "@/components/CategoryChip";
import PrimaryButton from "@/components/PrimaryButton";
import SearchBar from "@/components/SearchBar";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getGradientPair } from "@/utils/gradients";

type DraftIngredient = RecipeIngredientPayload & {
  ingredientName: string;
  category?: string;
};

const difficultyOptions = ["Easy", "Medium", "Hard"] as const;
const sourceOptions = ["manual", "ai-service", "community"] as const;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function defaultInstruction() {
  return "1. Prepare ingredients\n2. Cook step by step\n3. Serve and enjoy";
}

export default function CreateRecipeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cookingTimeMinutes, setCookingTimeMinutes] = useState("30");
  const [difficulty, setDifficulty] = useState<(typeof difficultyOptions)[number]>("Easy");
  const [servingSize, setServingSize] = useState("2");
  const [instructionText, setInstructionText] = useState(defaultInstruction());
  const [imageUrl, setImageUrl] = useState("");
  const [sourceType, setSourceType] = useState<(typeof sourceOptions)[number]>("manual");

  const [searchText, setSearchText] = useState("");
  const [ingredientResults, setIngredientResults] = useState<Ingredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<DraftIngredient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const gradient = useMemo(() => getGradientPair({ name, recipeName: name }), [name]);

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
        const page = await ingredientsApi.search(keyword, 1, 12);
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

  const addIngredient = useCallback((ingredient: Ingredient) => {
    if (selectedIds.has(ingredient.id)) return;

    setSelectedIngredients((current) => [
      ...current,
      {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        category: ingredient.category,
        quantity: 1,
        unit: ingredient.defaultUnit || ingredient.unit || "g",
        isRequired: true,
        note: ""
      }
    ]);
    setSearchText("");
    setIngredientResults([]);
    setErrorMessage("");
  }, [selectedIds]);

  const updateIngredient = useCallback((ingredientId: string, patch: Partial<DraftIngredient>) => {
    setSelectedIngredients((current) => current.map((item) => (item.ingredientId === ingredientId ? { ...item, ...patch } : item)));
  }, []);

  const removeIngredient = useCallback((ingredientId: string) => {
    setSelectedIngredients((current) => current.filter((item) => item.ingredientId !== ingredientId));
  }, []);

  const validate = useCallback(() => {
    if (!user?.userId) return "Please sign in first.";
    if (!name.trim()) return "Recipe name is required.";
    if (selectedIngredients.length === 0) return "Add at least one ingredient.";
    const invalid = selectedIngredients.find((item) => !Number.isFinite(item.quantity) || item.quantity <= 0);
    if (invalid) return `${invalid.ingredientName}: quantity must be greater than 0.`;
    return "";
  }, [name, selectedIngredients.length, user?.userId, selectedIngredients]);

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setCookingTimeMinutes("30");
    setDifficulty("Easy");
    setServingSize("2");
    setInstructionText(defaultInstruction());
    setImageUrl("");
    setSourceType("manual");
    setSearchText("");
    setIngredientResults([]);
    setSelectedIngredients([]);
    setErrorMessage("");
  }, []);

  const submitRecipe = useCallback(async () => {
    const validation = validate();
    if (validation) {
      setErrorMessage(validation);
      return;
    }

    const minutes = Number(cookingTimeMinutes.replace(",", "."));
    const servings = Number(servingSize.replace(",", "."));
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setErrorMessage("Cooking time must be greater than 0.");
      return;
    }
    if (!Number.isFinite(servings) || servings <= 0) {
      setErrorMessage("Serving size must be greater than 0.");
      return;
    }

    const payload: RecipePayload = {
      name: name.trim(),
      description: description.trim() || null,
      cookingTimeMinutes: Math.round(minutes),
      difficulty,
      servingSize: Math.round(servings),
      instructionText: instructionText.trim(),
      imageUrl: imageUrl.trim() || null,
      sourceType,
      gradientFrom: gradient.start,
      gradientTo: gradient.end,
      ingredients: selectedIngredients.map((item) => ({
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        quantity: item.quantity,
        unit: item.unit.trim(),
        isRequired: item.isRequired,
        note: item.note?.trim() || ""
      }))
    };

    setIsSaving(true);
    setErrorMessage("");
    try {
      const created = await recipesApi.create(payload);
      Alert.alert("Recipe created", `${created.name} is ready to use.`);
      resetForm();
      navigation.navigate("RecipeDetail", { mealId: created.id });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create recipe.");
    } finally {
      setIsSaving(false);
    }
  }, [cookingTimeMinutes, description, difficulty, gradient.end, gradient.start, imageUrl, instructionText, name, navigation, resetForm, selectedIngredients, servingSize, sourceType, validate]);

  const refreshSearch = useCallback(async () => {
    if (!searchText.trim()) return;
    setIsRefreshing(true);
    try {
      const page = await ingredientsApi.search(searchText.trim(), 1, 12);
      setIngredientResults(page.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Cannot refresh ingredient search.");
    } finally {
      setIsRefreshing(false);
    }
  }, [searchText]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshSearch} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 20, paddingBottom: 42, gap: 16 }}
      >
        <View
          style={{
            borderRadius: 28,
            padding: 18,
            overflow: "hidden",
            backgroundColor: gradient.start,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.18)"
          }}
        >
          <View style={{ position: "absolute", top: -36, right: -24, width: 150, height: 150, borderRadius: 75, backgroundColor: gradient.end, opacity: 0.34 }} />
          <View style={{ position: "absolute", left: -18, bottom: -26, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.22)" }} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ color: colors.textDark, fontSize: 30, fontWeight: "900", lineHeight: 36 }} selectable>
                Create recipe
              </Text>
              <Text style={{ color: colors.textDark, fontSize: 13, fontWeight: "700", lineHeight: 19, opacity: 0.9 }} selectable>
                Build a meal with linked ingredient ids, gradient, and ingredient mapping for both BE and AI service.
              </Text>
            </View>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.28)",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <MaterialCommunityIcons name="notebook-edit-outline" size={30} color={colors.textDark} />
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }} selectable>
            Recipe details
          </Text>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Fried rice with eggs" />
          <Field label="Description" value={description} onChangeText={setDescription} placeholder="Short and appetizing description" multiline />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Cooking time (min)" value={cookingTimeMinutes} onChangeText={setCookingTimeMinutes} placeholder="30" keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Serving size" value={servingSize} onChangeText={setServingSize} placeholder="2" keyboardType="decimal-pad" />
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900" }} selectable>
              Difficulty
            </Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {difficultyOptions.map((option) => (
                <CategoryChip key={option} label={option} active={difficulty === option} icon="chef-hat" onPress={() => setDifficulty(option)} />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900" }} selectable>
              Source type
            </Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {sourceOptions.map((option) => (
                <CategoryChip key={option} label={option} active={sourceType === option} icon="source-branch" onPress={() => setSourceType(option)} />
              ))}
            </View>
          </View>

          <Field label="Image URL" value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." />
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }} selectable>
              Ingredients
            </Text>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }} selectable>
              {selectedIngredients.length} selected
            </Text>
          </View>

          <SearchBar placeholder="Search ingredient to add" value={searchText} onChangeText={setSearchText} />
          {isSearching ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.muted, fontWeight: "700" }} selectable>
                Searching ingredients...
              </Text>
            </View>
          ) : null}

          {searchText.trim().length >= 2 ? (
            <View style={{ gap: 10 }}>
              {ingredientResults.length === 0 ? (
                <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 19 }} selectable>
                  No ingredient found. You can still continue by adding ingredients from a different keyword.
                </Text>
              ) : (
                ingredientResults.map((item) => {
                  const selected = selectedIds.has(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      disabled={selected}
                      onPress={() => addIngredient(item)}
                      style={({ pressed }) => ({
                        borderRadius: 14,
                        padding: 12,
                        backgroundColor: selected ? "rgba(57,217,138,0.14)" : colors.white,
                        borderWidth: 1,
                        borderColor: selected ? "rgba(57,217,138,0.45)" : colors.line,
                        opacity: pressed ? 0.85 : 1
                      })}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.textDark, fontSize: 15, fontWeight: "900" }} selectable>
                            {item.name}
                          </Text>
                          <Text style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "700", marginTop: 4 }} selectable>
                            {item.category || "Ingredient"} · {item.defaultUnit || item.unit || "g"}
                          </Text>
                        </View>
                        <Ionicons name={selected ? "checkmark-circle" : "add-circle"} size={25} color={selected ? colors.success : colors.primary} />
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : null}

          {selectedIngredients.length > 0 ? (
            <View style={{ gap: 12 }}>
              {selectedIngredients.map((item) => (
                <View key={item.ingredientId} style={{ borderRadius: 16, backgroundColor: colors.white, padding: 12, gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textDark, fontSize: 15, fontWeight: "900" }} selectable>
                        {item.ingredientName}
                      </Text>
                      <Text style={{ color: colors.mutedDark, fontSize: 11, fontWeight: "700", marginTop: 4 }} selectable>
                        {item.category || "Ingredient"}
                      </Text>
                    </View>
                    <Pressable onPress={() => removeIngredient(item.ingredientId)} hitSlop={12}>
                      <Ionicons name="close-circle" size={24} color={colors.danger} />
                    </Pressable>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <FieldInline value={String(item.quantity)} onChangeText={(value) => updateIngredient(item.ingredientId, { quantity: Number(value.replace(",", ".")) || 0 })} placeholder="Qty" keyboardType="decimal-pad" />
                    <FieldInline value={item.unit} onChangeText={(value) => updateIngredient(item.ingredientId, { unit: value })} placeholder="Unit" />
                  </View>
                  <Field label="Note" value={item.note} onChangeText={(value) => updateIngredient(item.ingredientId, { note: value })} placeholder="Optional note" multiline />
                </View>
              ))}
            </View>
          ) : (
            <View style={{ borderRadius: 16, padding: 14, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: colors.line }}>
              <Text style={{ color: colors.text, fontWeight: "800", lineHeight: 20 }} selectable>
                Search ingredients and tap Add to build the recipe payload.
              </Text>
            </View>
          )}
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }} selectable>
            Instructions
          </Text>
          <Field label="Instruction text" value={instructionText} onChangeText={setInstructionText} placeholder="Write the recipe steps" multiline />

          {errorMessage ? (
            <Text style={{ color: "#FFE2E2", fontWeight: "800", lineHeight: 20 }} selectable>
              {errorMessage}
            </Text>
          ) : null}

          <PrimaryButton title={isSaving ? "Saving..." : "Create recipe"} icon="content-save" onPress={submitRecipe} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "decimal-pad";
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900" }} selectable>
        {label}
      </Text>
      <View
        style={{
          minHeight: multiline ? 84 : 48,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: "rgba(255,255,255,0.12)",
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 0,
          justifyContent: multiline ? "flex-start" : "center"
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType={keyboardType}
          multiline={multiline}
          style={{
            minHeight: multiline ? 62 : 42,
            color: colors.text,
            fontSize: 14,
            fontWeight: "700",
            textAlignVertical: multiline ? "top" : "center"
          }}
        />
      </View>
    </View>
  );
}

function FieldInline({
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
