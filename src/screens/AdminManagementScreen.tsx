import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient, IngredientPayload } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import type { Recipe, RecipeIngredientPayload, RecipePayload } from "@/api/recipes";
import { recipesApi } from "@/api/recipes";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";

type AdminTab = "recipes" | "ingredients";
type DeleteTarget = { type: AdminTab; id: string; name: string } | null;

const emptyIngredientForm = {
  id: "",
  name: "",
  category: "Vegetable",
  unit: "g",
  caloriesPerUnit: "0",
  proteinPerUnit: "0",
  fatPerUnit: "0",
  carbPerUnit: "0",
  imageUrl: ""
};

const emptyRecipeForm = {
  id: "",
  name: "",
  description: "",
  cookingTimeMinutes: "20",
  difficulty: "Easy",
  servingSize: "1",
  instructionText: "",
  imageUrl: "",
  sourceType: "Manual",
  ingredients: [] as RecipeIngredientPayload[]
};

function toNumber(value: string) {
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function imageUri(value?: string | null) {
  return normalizeRemoteImageUrl(value);
}

export default function AdminManagementScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { signOut } = useAuth();
  const toast = useToast();
  const initialTab: AdminTab = route.params?.initialTab === "ingredients" ? "ingredients" : "recipes";
  const showBackButton = route.params?.showBackButton ?? true;
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipeForm, setRecipeForm] = useState(emptyRecipeForm);
  const [ingredientForm, setIngredientForm] = useState(emptyIngredientForm);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [recipeListSearch, setRecipeListSearch] = useState("");
  const [ingredientListSearch, setIngredientListSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const ingredientById = useMemo(() => new Map(ingredients.map((item) => [item.id, item])), [ingredients]);
  const filteredIngredients = useMemo(() => {
    const keyword = ingredientSearch.trim().toLowerCase();
    if (!keyword) return ingredients.slice(0, 12);
    return ingredients.filter((item) => `${item.name} ${item.category} ${item.normalizedName}`.toLowerCase().includes(keyword)).slice(0, 12);
  }, [ingredientSearch, ingredients]);
  const displayedRecipes = useMemo(() => {
    const keyword = normalizeText(recipeListSearch);
    if (!keyword) return recipes;
    return recipes.filter((recipe) => [recipe.name, recipe.description, recipe.difficulty, recipe.sourceType].some((value) => normalizeText(value || "").includes(keyword)));
  }, [recipeListSearch, recipes]);
  const displayedIngredients = useMemo(() => {
    const keyword = normalizeText(ingredientListSearch);
    if (!keyword) return ingredients;
    return ingredients.filter((ingredient) => [ingredient.name, ingredient.normalizedName, ingredient.category, ingredient.unit].some((value) => normalizeText(value || "").includes(keyword)));
  }, [ingredientListSearch, ingredients]);

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [recipePage, ingredientPage] = await Promise.all([recipesApi.list(1, 100), ingredientsApi.list(1, 100)]);
      setRecipes(recipePage.data);
      setIngredients(ingredientPage.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa tải được dữ liệu quản trị.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAdminData();
    }, [loadAdminData])
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const openCreateRecipe = () => navigation.navigate("AdminRecipeForm");
  const openCreateIngredient = () => navigation.navigate("AdminIngredientForm");
  const resetRecipeForm = () => setRecipeForm(emptyRecipeForm);
  const resetIngredientForm = () => setIngredientForm(emptyIngredientForm);

  const editRecipe = (recipe: Recipe) => {
    navigation.navigate("AdminRecipeForm", { recipe });
  };

  const editIngredient = (ingredient: Ingredient) => {
    navigation.navigate("AdminIngredientForm", { ingredient });
  };

  const addRecipeIngredient = (ingredient: Ingredient) => {
    if (recipeForm.ingredients.some((item) => item.ingredientId === ingredient.id)) return;
    setRecipeForm((current) => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        {
          ingredientId: ingredient.id,
          quantity: 1,
          unit: ingredient.unit || "g",
          isRequired: true,
          note: ""
        }
      ]
    }));
  };

  const updateRecipeIngredient = (index: number, patch: Partial<RecipeIngredientPayload>) => {
    setRecipeForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    }));
  };

  const removeRecipeIngredient = (index: number) => {
    setRecipeForm((current) => ({
      ...current,
      ingredients: current.ingredients.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const saveIngredient = async () => {
    const cleanName = ingredientForm.name.trim();
    const cleanUnit = ingredientForm.unit.trim();
    if (!cleanName) {
      setErrorMessage("Vui lòng nhập tên nguyên liệu.");
      return;
    }
    if (!cleanUnit) {
      setErrorMessage("Vui lòng nhập đơn vị.");
      return;
    }

    const payload: IngredientPayload = {
      name: cleanName,
      category: ingredientForm.category.trim() || "Other",
      unit: cleanUnit,
      caloriesPerUnit: toNumber(ingredientForm.caloriesPerUnit),
      proteinPerUnit: toNumber(ingredientForm.proteinPerUnit),
      fatPerUnit: toNumber(ingredientForm.fatPerUnit),
      carbPerUnit: toNumber(ingredientForm.carbPerUnit),
      imageUrl: ingredientForm.imageUrl.trim()
    };

    setIsSaving(true);
    setErrorMessage("");
    try {
      if (ingredientForm.id) {
        await ingredientsApi.update(ingredientForm.id, payload);
        toast.show("Đã cập nhật nguyên liệu.");
      } else {
        await ingredientsApi.create(payload);
        toast.show("Đã tạo nguyên liệu mới.");
      }
      resetIngredientForm();
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa lưu được nguyên liệu.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveRecipe = async () => {
    const cleanName = recipeForm.name.trim();
    if (!cleanName) {
      setErrorMessage("Vui lòng nhập tên công thức.");
      return;
    }
    if (recipeForm.ingredients.length === 0) {
      setErrorMessage("Vui lòng thêm ít nhất một nguyên liệu vào công thức.");
      return;
    }

    const payload: RecipePayload = {
      name: cleanName,
      description: recipeForm.description.trim(),
      cookingTimeMinutes: toNumber(recipeForm.cookingTimeMinutes),
      difficulty: recipeForm.difficulty.trim() || "Easy",
      servingSize: toNumber(recipeForm.servingSize),
      instructionText: recipeForm.instructionText.trim(),
      imageUrl: recipeForm.imageUrl.trim(),
      sourceType: recipeForm.sourceType.trim() || "Manual",
      ingredients: recipeForm.ingredients.map((item) => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        unit: item.unit.trim(),
        note: item.note.trim()
      }))
    };

    setIsSaving(true);
    setErrorMessage("");
    try {
      if (recipeForm.id) {
        await recipesApi.update(recipeForm.id, payload);
        toast.show("Đã cập nhật công thức.");
      } else {
        await recipesApi.create(payload);
        toast.show("Đã tạo công thức mới.");
      }
      resetRecipeForm();
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa lưu được công thức.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      if (deleteTarget.type === "recipes") {
        await recipesApi.remove(deleteTarget.id);
        toast.show("Đã xóa công thức.");
      } else {
        await ingredientsApi.remove(deleteTarget.id);
        toast.show("Đã xóa nguyên liệu.");
      }
      setDeleteTarget(null);
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa xóa được dữ liệu.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadAdminData} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 22, paddingBottom: 42, gap: 18 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {showBackButton ? (
            <Pressable onPress={() => navigation.goBack()} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="chevron-back" size={25} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="shield-crown-outline" size={25} color={colors.textDark} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 25, fontWeight: "900" }} selectable>
              Quản trị dữ liệu
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", marginTop: 2 }} selectable>
              Công thức, nguyên liệu và dữ liệu gợi ý món
            </Text>
          </View>
          {showBackButton ? (
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="shield-crown-outline" size={25} color={colors.textDark} />
            </View>
          ) : (
            <Pressable onPress={signOut} style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.78 : 1 })}>
              <MaterialCommunityIcons name="logout" size={24} color={colors.primary} />
            </Pressable>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <AdminTabButton label="Công thức" icon="notebook-outline" active={activeTab === "recipes"} onPress={() => setActiveTab("recipes")} />
          <AdminTabButton label="Nguyên liệu" icon="food-apple-outline" active={activeTab === "ingredients"} onPress={() => setActiveTab("ingredients")} />
        </View>

        {errorMessage ? (
          <View style={{ borderRadius: 14, backgroundColor: "rgba(255,77,79,0.18)", borderWidth: 1, borderColor: "rgba(255,77,79,0.45)", padding: 13 }}>
            <Text style={{ color: "#FFE6E6", fontSize: 13, fontWeight: "800", lineHeight: 20 }} selectable>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {activeTab === "recipes" ? (
          <>
            <MetricStrip leftLabel="Recipe" leftValue={recipes.length} rightLabel="Ingredient" rightValue={ingredients.length} />
            <SectionTitle title="Danh sách công thức" actionLabel="Tạo mới" onAction={openCreateRecipe} />
            <SearchBox value={recipeListSearch} onChangeText={setRecipeListSearch} placeholder="Tìm theo tên, mô tả, độ khó..." />
            <View style={{ gap: 12 }}>
              {isLoading ? (
                <LoadingCard />
              ) : displayedRecipes.length === 0 ? (
                <EmptyState message="Không tìm thấy công thức phù hợp." />
              ) : (
                displayedRecipes.map((recipe) => <RecipeAdminCard key={recipe.id} recipe={recipe} onEdit={() => editRecipe(recipe)} onDelete={() => setDeleteTarget({ type: "recipes", id: recipe.id, name: recipe.name })} />)
              )}
            </View>
          </>
        ) : (
          <>
            <MetricStrip leftLabel="Ingredient" leftValue={ingredients.length} rightLabel="Recipe" rightValue={recipes.length} />
            <SectionTitle title="Danh sách nguyên liệu" actionLabel="Tạo mới" onAction={openCreateIngredient} />
            <SearchBox value={ingredientListSearch} onChangeText={setIngredientListSearch} placeholder="Tìm theo tên, nhóm, đơn vị..." />
            <View style={{ gap: 12 }}>
              {isLoading ? (
                <LoadingCard />
              ) : displayedIngredients.length === 0 ? (
                <EmptyState message="Không tìm thấy nguyên liệu phù hợp." />
              ) : (
                displayedIngredients.map((ingredient) => <IngredientAdminCard key={ingredient.id} ingredient={ingredient} onEdit={() => editIngredient(ingredient)} onDelete={() => setDeleteTarget({ type: "ingredients", id: ingredient.id, name: ingredient.name })} />)
              )}
            </View>
          </>
        )}
      </ScrollView>

      <ConfirmDeleteModal target={deleteTarget} isSaving={isSaving} onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </SafeAreaView>
  );
}

function AdminTabButton({ label, icon, active, onPress }: { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 52,
        borderRadius: 14,
        backgroundColor: active ? colors.primary : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.line,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: pressed ? 0.82 : 1
      })}
    >
      <MaterialCommunityIcons name={icon} size={21} color={active ? colors.textDark : colors.text} />
      <Text style={{ color: active ? colors.textDark : colors.text, fontSize: 14, fontWeight: "900" }} selectable>
        {label}
      </Text>
    </Pressable>
  );
}

function MetricStrip({ leftLabel, leftValue, rightLabel, rightValue }: { leftLabel: string; leftValue: number; rightLabel: string; rightValue: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <MetricCard label={leftLabel} value={leftValue} icon="database-outline" />
      <MetricCard label={rightLabel} value={rightValue} icon="chart-box-outline" alignRight />
    </View>
  );
}

function MetricCard({ label, value, icon, alignRight = false }: { label: string; value: number; icon: keyof typeof MaterialCommunityIcons.glyphMap; alignRight?: boolean }) {
  return (
    <View style={{ flex: 1, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 7, alignItems: alignRight ? "flex-end" : "flex-start" }}>
      <MaterialCommunityIcons name={icon} size={23} color={colors.primary} />
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: "900", fontVariant: ["tabular-nums"] }} selectable>
        {value}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }} selectable>
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
        {title}
      </Text>
      <Pressable onPress={onAction} style={({ pressed }) => ({ minHeight: 36, borderRadius: 18, backgroundColor: colors.primary, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.82 : 1 })}>
        <MaterialCommunityIcons name="plus" size={18} color={colors.textDark} />
        <Text style={{ color: colors.textDark, fontSize: 12, fontWeight: "900" }} selectable>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function LoadingCard() {
  return (
    <View style={{ minHeight: 92, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", gap: 10 }}>
      <ActivityIndicator color={colors.primary} />
      <Text style={{ color: colors.text, fontWeight: "800" }} selectable>
        Đang tải dữ liệu...
      </Text>
    </View>
  );
}

function SearchBox({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return (
    <View style={{ minHeight: 50, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 13 }}>
      <Ionicons name="search" size={20} color={colors.primary} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "800", minHeight: 48 }} />
      {value ? (
        <Pressable onPress={() => onChangeText("")} style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)" }}>
          <Ionicons name="close" size={17} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={{ minHeight: 92, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", gap: 8, padding: 16 }}>
      <MaterialCommunityIcons name="database-search-outline" size={28} color={colors.primary} />
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "900", textAlign: "center" }} selectable>
        {message}
      </Text>
    </View>
  );
}

function RemoteImage({ uri, style }: { uri?: string | null; style: object }) {
  const [failed, setFailed] = useState(false);
  return <Image source={{ uri: failed ? FALLBACK_FOOD_IMAGE_URL : imageUri(uri) }} onError={() => setFailed(true)} style={style} />;
}

function RecipeAdminCard({ recipe, onEdit, onDelete }: { recipe: Recipe; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={{ borderRadius: 14, backgroundColor: colors.white, overflow: "hidden", boxShadow: "0 12px 24px rgba(0,0,0,0.20)" }}>
      <RemoteImage uri={recipe.imageUrl} style={{ width: "100%", height: 132, backgroundColor: colors.secondary }} />
      <View style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textDark, fontSize: 18, fontWeight: "900" }} selectable>
              {recipe.name}
            </Text>
            <Text numberOfLines={2} style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "700", lineHeight: 18, marginTop: 3 }}>
              {recipe.description || "Chưa có mô tả"}
            </Text>
          </View>
          <View style={{ borderRadius: 999, backgroundColor: colors.secondary, paddingHorizontal: 9, paddingVertical: 6, alignSelf: "flex-start" }}>
            <Text style={{ color: colors.primaryDark, fontSize: 11, fontWeight: "900" }} selectable>
              {recipe.difficulty || "Manual"}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <MiniInfo icon="timer-outline" text={`${recipe.cookingTimeMinutes || 0} phút`} />
          <MiniInfo icon="account-group-outline" text={`${recipe.servingSize || 0} phần`} />
          <MiniInfo icon="source-branch" text={recipe.sourceType || "Manual"} />
        </View>
        <ActionRow onEdit={onEdit} onDelete={onDelete} />
      </View>
    </View>
  );
}

function IngredientAdminCard({ ingredient, onEdit, onDelete }: { ingredient: Ingredient; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={{ minHeight: 96, borderRadius: 14, backgroundColor: colors.white, padding: 12, flexDirection: "row", gap: 12, alignItems: "center" }}>
      <RemoteImage uri={ingredient.imageUrl} style={{ width: 74, height: 74, borderRadius: 14, backgroundColor: colors.secondary }} />
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ color: colors.textDark, fontSize: 16, fontWeight: "900" }} selectable>
          {ingredient.name}
        </Text>
        <Text style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "800" }} selectable>
          {ingredient.category || "Other"} · {ingredient.unit}
        </Text>
        <Text style={{ color: colors.primaryDark, fontSize: 11, fontWeight: "900" }} selectable>
          {ingredient.caloriesPerUnit} kcal · Đạm {ingredient.proteinPerUnit}g
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        <IconButton icon="pencil-outline" tone="edit" onPress={onEdit} />
        <IconButton icon="trash-can-outline" tone="delete" onPress={onDelete} />
      </View>
    </View>
  );
}

function MiniInfo({ icon, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <MaterialCommunityIcons name={icon} size={15} color={colors.primary} />
      <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "800" }} selectable>
        {text}
      </Text>
    </View>
  );
}

function ActionRow({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Pressable onPress={onEdit} style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: "#EEF3EF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, opacity: pressed ? 0.82 : 1 })}>
        <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textDark} />
        <Text style={{ color: colors.textDark, fontWeight: "900" }} selectable>
          Sửa
        </Text>
      </Pressable>
      <Pressable onPress={onDelete} style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: "rgba(255,77,79,0.14)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, opacity: pressed ? 0.82 : 1 })}>
        <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
        <Text style={{ color: colors.danger, fontWeight: "900" }} selectable>
          Xóa
        </Text>
      </Pressable>
    </View>
  );
}

function IconButton({ icon, tone, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; tone: "edit" | "delete"; onPress: () => void }) {
  const color = tone === "delete" ? colors.danger : colors.primaryDark;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 12, backgroundColor: tone === "delete" ? "rgba(255,77,79,0.12)" : colors.secondary, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.76 : 1 })}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
    </Pressable>
  );
}

function IngredientForm({ form, setForm, onSave, onCancel, isSaving }: { form: typeof emptyIngredientForm; setForm: (value: typeof emptyIngredientForm | ((current: typeof emptyIngredientForm) => typeof emptyIngredientForm)) => void; onSave: () => void; onCancel: () => void; isSaving: boolean }) {
  return (
    <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
        {form.id ? "Cập nhật nguyên liệu" : "Tạo nguyên liệu mới"}
      </Text>
      <RemoteImage uri={form.imageUrl} style={{ width: "100%", height: 140, borderRadius: 14, backgroundColor: colors.secondary }} />
      <FormInput label="Tên nguyên liệu" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder="Ví dụ: Cà rốt" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <FormInput label="Nhóm" value={form.category} onChangeText={(category) => setForm((current) => ({ ...current, category }))} placeholder="Vegetable" />
        </View>
        <View style={{ flex: 1 }}>
          <FormInput label="Đơn vị" value={form.unit} onChangeText={(unit) => setForm((current) => ({ ...current, unit }))} placeholder="g" />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <FormInput label="Calories" value={form.caloriesPerUnit} onChangeText={(caloriesPerUnit) => setForm((current) => ({ ...current, caloriesPerUnit }))} placeholder="0" keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <FormInput label="Protein" value={form.proteinPerUnit} onChangeText={(proteinPerUnit) => setForm((current) => ({ ...current, proteinPerUnit }))} placeholder="0" keyboardType="decimal-pad" />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <FormInput label="Fat" value={form.fatPerUnit} onChangeText={(fatPerUnit) => setForm((current) => ({ ...current, fatPerUnit }))} placeholder="0" keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <FormInput label="Carb" value={form.carbPerUnit} onChangeText={(carbPerUnit) => setForm((current) => ({ ...current, carbPerUnit }))} placeholder="0" keyboardType="decimal-pad" />
        </View>
      </View>
      <FormInput label="Image URL" value={form.imageUrl} onChangeText={(imageUrl) => setForm((current) => ({ ...current, imageUrl }))} placeholder="https://..." />
      <FormActions isSaving={isSaving} saveLabel={form.id ? "Lưu nguyên liệu" : "Tạo nguyên liệu"} onSave={onSave} onCancel={onCancel} />
    </View>
  );
}

function RecipeForm({
  form,
  setForm,
  filteredIngredients,
  ingredientById,
  ingredientSearch,
  setIngredientSearch,
  onAddIngredient,
  onUpdateIngredient,
  onRemoveIngredient,
  onSave,
  onCancel,
  isSaving
}: {
  form: typeof emptyRecipeForm;
  setForm: (value: typeof emptyRecipeForm | ((current: typeof emptyRecipeForm) => typeof emptyRecipeForm)) => void;
  ingredients: Ingredient[];
  filteredIngredients: Ingredient[];
  ingredientById: Map<string, Ingredient>;
  ingredientSearch: string;
  setIngredientSearch: (value: string) => void;
  onAddIngredient: (ingredient: Ingredient) => void;
  onUpdateIngredient: (index: number, patch: Partial<RecipeIngredientPayload>) => void;
  onRemoveIngredient: (index: number) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  return (
    <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
        {form.id ? "Cập nhật công thức" : "Tạo công thức mới"}
      </Text>
      <RemoteImage uri={form.imageUrl} style={{ width: "100%", height: 150, borderRadius: 14, backgroundColor: colors.secondary }} />
      <FormInput label="Tên công thức" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder="Ví dụ: Đậu hũ sốt cà chua" />
      <FormInput label="Mô tả" value={form.description} onChangeText={(description) => setForm((current) => ({ ...current, description }))} placeholder="Mô tả ngắn" multiline />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <FormInput label="Thời gian" value={form.cookingTimeMinutes} onChangeText={(cookingTimeMinutes) => setForm((current) => ({ ...current, cookingTimeMinutes }))} placeholder="20" keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <FormInput label="Khẩu phần" value={form.servingSize} onChangeText={(servingSize) => setForm((current) => ({ ...current, servingSize }))} placeholder="1" keyboardType="decimal-pad" />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <FormInput label="Độ khó" value={form.difficulty} onChangeText={(difficulty) => setForm((current) => ({ ...current, difficulty }))} placeholder="Easy" />
        </View>
        <View style={{ flex: 1 }}>
          <FormInput label="Nguồn" value={form.sourceType} onChangeText={(sourceType) => setForm((current) => ({ ...current, sourceType }))} placeholder="Manual" />
        </View>
      </View>
      <FormInput label="Image URL" value={form.imageUrl} onChangeText={(imageUrl) => setForm((current) => ({ ...current, imageUrl }))} placeholder="https://..." />
      <FormInput label="Cách nấu" value={form.instructionText} onChangeText={(instructionText) => setForm((current) => ({ ...current, instructionText }))} placeholder="Bước 1..." multiline />

      <View style={{ gap: 10 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "900" }} selectable>
          Thêm nguyên liệu vào recipe
        </Text>
        <FormInput label="Tìm nguyên liệu" value={ingredientSearch} onChangeText={setIngredientSearch} placeholder="Cà, trứng, gạo..." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {filteredIngredients.map((ingredient) => {
            const selected = form.ingredients.some((item) => item.ingredientId === ingredient.id);
            return (
              <Pressable key={ingredient.id} onPress={() => onAddIngredient(ingredient)} style={({ pressed }) => ({ width: 138, borderRadius: 14, backgroundColor: selected ? "rgba(57,217,138,0.22)" : colors.white, borderWidth: 2, borderColor: selected ? colors.success : "transparent", overflow: "hidden", opacity: pressed ? 0.82 : 1 })}>
                <RemoteImage uri={ingredient.imageUrl} style={{ width: "100%", height: 72, backgroundColor: colors.secondary }} />
                <View style={{ padding: 9, gap: 4 }}>
                  <Text numberOfLines={2} style={{ color: colors.textDark, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>
                    {ingredient.name}
                  </Text>
                  <Text style={{ color: colors.primaryDark, fontSize: 10, fontWeight: "900" }} selectable>
                    {selected ? "Đã thêm" : ingredient.unit}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ gap: 10 }}>
        {form.ingredients.length === 0 ? (
          <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(255,255,255,0.12)", padding: 14 }}>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "800", lineHeight: 20 }} selectable>
              Chưa có nguyên liệu trong công thức.
            </Text>
          </View>
        ) : (
          form.ingredients.map((item, index) => {
            const ingredient = ingredientById.get(item.ingredientId);
            return (
              <View key={`${item.ingredientId}-${index}`} style={{ borderRadius: 14, backgroundColor: colors.white, padding: 12, gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <Text style={{ flex: 1, color: colors.textDark, fontSize: 15, fontWeight: "900" }} selectable>
                    {ingredient?.name || item.ingredientId}
                  </Text>
                  <Pressable onPress={() => onRemoveIngredient(index)}>
                    <MaterialCommunityIcons name="close-circle" size={24} color={colors.danger} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput value={String(item.quantity)} onChangeText={(value) => onUpdateIngredient(index, { quantity: toNumber(value) })} keyboardType="decimal-pad" placeholder="SL" placeholderTextColor={colors.mutedDark} style={{ flex: 1, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#DCE8DD", color: colors.textDark, fontWeight: "800", paddingHorizontal: 10 }} />
                  <TextInput value={item.unit} onChangeText={(unit) => onUpdateIngredient(index, { unit })} placeholder="Unit" placeholderTextColor={colors.mutedDark} style={{ width: 86, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#DCE8DD", color: colors.textDark, fontWeight: "800", paddingHorizontal: 10 }} />
                </View>
                <TextInput value={item.note} onChangeText={(note) => onUpdateIngredient(index, { note })} placeholder="Ghi chú cho nguyên liệu" placeholderTextColor={colors.mutedDark} style={{ minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#DCE8DD", color: colors.textDark, fontWeight: "700", paddingHorizontal: 10 }} />
                <Pressable onPress={() => onUpdateIngredient(index, { isRequired: !item.isRequired })} style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: item.isRequired ? colors.secondary : "#EEF3EF", paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ color: item.isRequired ? colors.primaryDark : colors.mutedDark, fontSize: 11, fontWeight: "900" }} selectable>
                    {item.isRequired ? "Bắt buộc" : "Tùy chọn"}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>
      <FormActions isSaving={isSaving} saveLabel={form.id ? "Lưu công thức" : "Tạo công thức"} onSave={onSave} onCancel={onCancel} />
    </View>
  );
}

function FormInput({ label, value, onChangeText, placeholder, keyboardType, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "decimal-pad"; multiline?: boolean }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900" }} selectable>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        style={{ minHeight: multiline ? 84 : 46, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: colors.line, color: colors.text, fontSize: 14, fontWeight: "700", paddingHorizontal: 12, paddingVertical: multiline ? 10 : 0, textAlignVertical: multiline ? "top" : "center" }}
      />
    </View>
  );
}

function FormActions({ isSaving, saveLabel, onSave, onCancel }: { isSaving: boolean; saveLabel: string; onSave: () => void; onCancel: () => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Pressable onPress={onCancel} disabled={isSaving} style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: pressed || isSaving ? 0.76 : 1 })}>
        <Text style={{ color: colors.text, fontWeight: "900" }} selectable>
          Hủy
        </Text>
      </Pressable>
      <Pressable onPress={onSave} disabled={isSaving} style={({ pressed }) => ({ flex: 1.4, minHeight: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: pressed || isSaving ? 0.76 : 1 })}>
        {isSaving ? <ActivityIndicator color={colors.textDark} /> : <MaterialCommunityIcons name="content-save" size={20} color={colors.textDark} />}
        <Text style={{ color: colors.textDark, fontWeight: "900" }} selectable>
          {isSaving ? "Đang lưu..." : saveLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function ConfirmDeleteModal({ target, isSaving, onCancel, onConfirm }: { target: DeleteTarget; isSaving: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal transparent visible={Boolean(target)} animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.58)", padding: 22, justifyContent: "center" }}>
        <View style={{ borderRadius: 18, backgroundColor: colors.white, padding: 18, gap: 14 }}>
          <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: "rgba(255,77,79,0.14)", alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="trash-can-outline" size={30} color={colors.danger} />
          </View>
          <Text style={{ color: colors.textDark, fontSize: 22, fontWeight: "900" }} selectable>
            Xóa dữ liệu?
          </Text>
          <Text style={{ color: colors.mutedDark, fontSize: 14, fontWeight: "700", lineHeight: 21 }} selectable>
            {target?.name} sẽ bị xóa khỏi hệ thống quản trị.
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={onCancel} disabled={isSaving} style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 25, backgroundColor: "#EEF3EF", alignItems: "center", justifyContent: "center", opacity: pressed || isSaving ? 0.76 : 1 })}>
              <Text style={{ color: colors.textDark, fontSize: 15, fontWeight: "900" }} selectable>
                Hủy
              </Text>
            </Pressable>
            <Pressable onPress={onConfirm} disabled={isSaving} style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 25, backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", opacity: pressed || isSaving ? 0.76 : 1 })}>
              <Text style={{ color: colors.white, fontSize: 15, fontWeight: "900" }} selectable>
                {isSaving ? "Đang xóa..." : "Xóa"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
