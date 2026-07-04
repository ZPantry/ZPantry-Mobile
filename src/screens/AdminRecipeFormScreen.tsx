import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import type { Recipe, RecipeIngredientPayload, RecipePayload, UploadFile } from "@/api/recipes";
import { recipesApi } from "@/api/recipes";
import { colors } from "@/constants/colors";
import { useToast } from "@/context/ToastContext";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";
import { getFriendlyErrorMessage } from "@/utils/localize";
import { pickUploadImage } from "@/utils/pickUploadImage";

type RecipeFormState = {
  id: string;
  name: string;
  description: string;
  cookingTimeMinutes: string;
  difficulty: string;
  servingSize: string;
  instructionText: string;
  imageUrl: string;
  imageFile: UploadFile | null;
  localImageUri: string;
  sourceType: string;
  gradientFrom: string;
  gradientTo: string;
  ingredients: RecipeIngredientPayload[];
};

const emptyRecipeForm: RecipeFormState = {
  id: "",
  name: "",
  description: "",
  cookingTimeMinutes: "20",
  difficulty: "Easy",
  servingSize: "1",
  instructionText: "",
  imageUrl: "",
  imageFile: null,
  localImageUri: "",
  sourceType: "Manual",
  gradientFrom: "#F4A21C",
  gradientTo: "#39D98A",
  ingredients: []
};

function toNumber(value: string) {
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function buildRecipeForm(recipe?: Recipe): RecipeFormState {
  if (!recipe) return emptyRecipeForm;
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description || "",
    cookingTimeMinutes: String(recipe.cookingTimeMinutes || 20),
    difficulty: recipe.difficulty || "Easy",
    servingSize: String(recipe.servingSize || 1),
    instructionText: recipe.instructionText || "",
    imageUrl: recipe.imageUrl || "",
    imageFile: null,
    localImageUri: "",
    sourceType: recipe.sourceType || "Manual",
    gradientFrom: recipe.gradientFrom || "#F4A21C",
    gradientTo: recipe.gradientTo || "#39D98A",
    ingredients: (recipe.ingredients || []).map((item) => ({
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit,
      isRequired: item.isRequired,
      note: item.note || ""
    }))
  };
}

export default function AdminRecipeFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const toast = useToast();
  const recipe = route.params?.recipe as Recipe | undefined;
  const [form, setForm] = useState<RecipeFormState>(() => buildRecipeForm(recipe));
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const ingredientById = useMemo(() => new Map(ingredients.map((item) => [item.id, item])), [ingredients]);
  const filteredIngredients = useMemo(() => {
    const keyword = normalizeText(ingredientSearch);
    const source = keyword
      ? ingredients.filter((item) => [item.name, item.normalizedName, item.category].some((value) => normalizeText(value || "").includes(keyword)))
      : ingredients;
    return source.slice(0, 18);
  }, [ingredientSearch, ingredients]);

  const loadIngredients = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const page = await ingredientsApi.list(1, 150);
      setIngredients(page.data);
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa tải được danh sách nguyên liệu."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIngredients();
  }, [loadIngredients]);

  const addRecipeIngredient = (ingredient: Ingredient) => {
    if (form.ingredients.some((item) => item.ingredientId === ingredient.id)) return;
    setForm((current) => ({
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
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    }));
  };

  const removeRecipeIngredient = (index: number) => {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const chooseImage = async () => {
    try {
      const picked = await pickUploadImage("recipe");
      if (!picked) return;
      setForm((current) => ({ ...current, imageFile: picked.file, localImageUri: picked.uri }));
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa chọn được ảnh.", "imageUpload"));
    }
  };

  const saveRecipe = async () => {
    const cleanName = form.name.trim();
    if (!cleanName) {
      setErrorMessage("Vui lòng nhập tên công thức.");
      return;
    }
    if (form.ingredients.length === 0) {
      setErrorMessage("Vui lòng thêm ít nhất một nguyên liệu vào công thức.");
      return;
    }

    const payload: RecipePayload = {
      name: cleanName,
      description: form.description.trim(),
      cookingTimeMinutes: toNumber(form.cookingTimeMinutes),
      difficulty: form.difficulty.trim() || "Easy",
      servingSize: toNumber(form.servingSize),
      instructionText: form.instructionText.trim(),
      imageUrl: form.imageUrl.trim(),
      sourceType: form.sourceType.trim() || "Manual",
      gradientFrom: form.gradientFrom.trim(),
      gradientTo: form.gradientTo.trim(),
      imageFile: form.imageFile,
      ingredients: form.ingredients.map((item) => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        unit: item.unit.trim(),
        note: item.note.trim()
      }))
    };

    setIsSaving(true);
    setErrorMessage("");
    try {
      if (form.id) {
        await recipesApi.update(form.id, payload);
        toast.show("Đã cập nhật công thức.");
      } else {
        await recipesApi.create(payload);
        toast.show("Đã tạo công thức mới.");
      }
      navigation.navigate("AdminManagement", { initialTab: "recipes", showBackButton: false });
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa lưu được công thức.", form.imageFile ? "imageUpload" : "default"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 22, paddingBottom: 42, gap: 16 }}>
        <AdminFormHeader title={form.id ? "Sửa công thức" : "Tạo công thức"} subtitle="Quản lý metadata, ảnh và nguyên liệu cho recipe" onBack={() => navigation.goBack()} />

        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

        <RemoteImage uri={form.localImageUri || form.imageUrl} style={{ width: "100%", height: 180, borderRadius: 16, backgroundColor: colors.secondary }} />
        <Pressable onPress={chooseImage} style={({ pressed }) => ({ minHeight: 46, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: pressed ? 0.78 : 1 })}>
          <MaterialCommunityIcons name="image-plus" size={20} color={colors.primary} />
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "900" }} selectable>
            {form.localImageUri ? "Đổi ảnh upload" : "Chọn ảnh upload"}
          </Text>
        </Pressable>

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
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FormInput label="Gradient From" value={form.gradientFrom} onChangeText={(gradientFrom) => setForm((current) => ({ ...current, gradientFrom }))} placeholder="#F4A21C" />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput label="Gradient To" value={form.gradientTo} onChangeText={(gradientTo) => setForm((current) => ({ ...current, gradientTo }))} placeholder="#39D98A" />
          </View>
        </View>
        <FormInput label="Cách nấu" value={form.instructionText} onChangeText={(instructionText) => setForm((current) => ({ ...current, instructionText }))} placeholder="Bước 1..." multiline />

        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }} selectable>
            Nguyên liệu trong công thức
          </Text>
          <FormInput label="Tìm nguyên liệu" value={ingredientSearch} onChangeText={setIngredientSearch} placeholder="Cà, trứng, gạo..." />
          {isLoading ? (
            <LoadingCard />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {filteredIngredients.map((ingredient) => {
                const selected = form.ingredients.some((item) => item.ingredientId === ingredient.id);
                return (
                  <Pressable key={ingredient.id} onPress={() => addRecipeIngredient(ingredient)} style={({ pressed }) => ({ width: "47.5%", minWidth: 142, flexGrow: 1, borderRadius: 14, backgroundColor: selected ? "rgba(57,217,138,0.20)" : colors.white, borderWidth: 2, borderColor: selected ? colors.success : "transparent", overflow: "hidden", opacity: pressed ? 0.82 : 1 })}>
                    <RemoteImage uri={ingredient.imageUrl} style={{ width: "100%", height: 76, backgroundColor: colors.secondary }} />
                    <View style={{ padding: 9, gap: 4 }}>
                      <Text numberOfLines={2} style={{ color: colors.textDark, fontSize: 13, fontWeight: "900", lineHeight: 17 }}>
                        {ingredient.name}
                      </Text>
                      <Text style={{ color: selected ? colors.success : colors.primaryDark, fontSize: 10, fontWeight: "900" }} selectable>
                        {selected ? "Đã thêm" : ingredient.unit}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
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
                    <Pressable onPress={() => removeRecipeIngredient(index)}>
                      <MaterialCommunityIcons name="close-circle" size={24} color={colors.danger} />
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput value={String(item.quantity)} onChangeText={(value) => updateRecipeIngredient(index, { quantity: toNumber(value) })} keyboardType="decimal-pad" placeholder="SL" placeholderTextColor={colors.mutedDark} style={{ flex: 1, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#DCE8DD", color: colors.textDark, fontWeight: "800", paddingHorizontal: 10 }} />
                    <TextInput value={item.unit} onChangeText={(unit) => updateRecipeIngredient(index, { unit })} placeholder="Unit" placeholderTextColor={colors.mutedDark} style={{ width: 86, minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#DCE8DD", color: colors.textDark, fontWeight: "800", paddingHorizontal: 10 }} />
                  </View>
                  <TextInput value={item.note} onChangeText={(note) => updateRecipeIngredient(index, { note })} placeholder="Ghi chú cho nguyên liệu" placeholderTextColor={colors.mutedDark} style={{ minHeight: 42, borderRadius: 10, borderWidth: 1, borderColor: "#DCE8DD", color: colors.textDark, fontWeight: "700", paddingHorizontal: 10 }} />
                  <Pressable onPress={() => updateRecipeIngredient(index, { isRequired: !item.isRequired })} style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: item.isRequired ? colors.secondary : "#EEF3EF", paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ color: item.isRequired ? colors.primaryDark : colors.mutedDark, fontSize: 11, fontWeight: "900" }} selectable>
                      {item.isRequired ? "Bắt buộc" : "Tùy chọn"}
                    </Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        <FormActions isSaving={isSaving} saveLabel={form.id ? "Lưu công thức" : "Tạo công thức"} onSave={saveRecipe} onCancel={() => navigation.goBack()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function AdminFormHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Pressable onPress={onBack} style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.78 : 1 })}>
        <Ionicons name="chevron-back" size={25} color={colors.primary} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: "900" }} selectable>
          {title}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", marginTop: 2 }} selectable>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function RemoteImage({ uri, style }: { uri?: string | null; style: object }) {
  const [failed, setFailed] = useState(false);
  return <Image source={{ uri: failed ? FALLBACK_FOOD_IMAGE_URL : normalizeRemoteImageUrl(uri) }} onError={() => setFailed(true)} style={style} />;
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

function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={{ borderRadius: 14, backgroundColor: "rgba(255,77,79,0.18)", borderWidth: 1, borderColor: "rgba(255,77,79,0.45)", padding: 13 }}>
      <Text style={{ color: "#FFE6E6", fontSize: 13, fontWeight: "800", lineHeight: 20 }} selectable>
        {message}
      </Text>
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
