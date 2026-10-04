import AiChefChat from "@/components/AiChefChat";
import FigmaAsset from '@/components/FigmaAsset';
import { exploreAssets as assets } from '@/constants/figmaAssets';
import Text from "@/components/AppText";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";
import ScrollView from "@/components/ScreenScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { pantryApi, type PantryApiItem } from "@/api/pantry";
import { recommendationsApi, type PersonalizedRecommendationOptions } from "@/api/recommendations";
import { recipesApi, type Recipe } from "@/api/recipes";
import type { Meal } from "@/types";
import { BrandPanel, SectionHeading, ActionRow } from "@/components/BrandPanel";
import CategoryChip from "@/components/CategoryChip";
import MealCard from "@/components/MealCard";
import SearchBar from "@/components/SearchBar";
import ExpiryAlertCard from "@/components/ExpiryAlertCard";
import SelectField from "@/components/SelectField";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { getFriendlyErrorMessage } from "@/utils/localize";

export default function MealSuggestionScreen() {
  const navigation = useNavigation<any>();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [catalogError, setCatalogError] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [pantry, setPantry] = useState<PantryApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const busy = useRef(false);
  const [topK, setTopK] = useState("5");
  const [mode, setMode] = useState<NonNullable<PersonalizedRecommendationOptions["mode"]>>("AUTO");
  const [mealType, setMealType] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("1");
  const requiresPantry = mode === "PANTRY_BASED";
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setPantry(await pantryApi.all()); setLoaded(true); }
    catch (e) { setError(getFriendlyErrorMessage(e, "Chưa tải được tủ thực phẩm.")); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true); setCatalogError("");
    try { setRecipes(await recipesApi.all()); }
    catch (e) { setCatalogError(getFriendlyErrorMessage(e, "Chưa tải được công thức.")); }
    finally { setCatalogLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void loadCatalog(); }, [loadCatalog]));
  const displayed = useMemo(() => {
    const normalize = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
    return recipes.filter(r => normalize(r.name + " " + (r.description || "")).includes(normalize(search)) &&
      (category !== "Nhanh dưới 20 phút" || r.cookingTimeMinutes <= 20) &&
      (category !== "Dễ thực hiện" || (r.difficulty || "").toLowerCase() === "easy"));
  }, [recipes, search, category]);
  const suggest = async () => {
    if (busy.current || (requiresPantry && (!loaded || !pantry.length))) return;
    busy.current = true; setSuggesting(true); setError("");
    try {
      const result = await recommendationsApi.personalized(Number(topK), { mode, servings: Number(servings),
        ...(mealType ? { mealType } : {}), ...(cookTime ? { maxCookTimeMinutes: Number(cookTime) } : {}) });
      navigation.navigate("MealRecommendationResults", {
        recommendations: result.recommendations,
        mode,
        pantryItems: (mode === "PROFILE_BASED" ? [] : pantry).map((p) => ({ id: p.id, ingredientId: p.ingredientId, name: p.ingredientName || "Nguyên liệu", quantity: p.quantity, unit: p.unit, source: "pantry" }))
      });
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa tạo được gợi ý. Vui lòng thử lại.")); }
    finally { busy.current = false; setSuggesting(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
    <ScrollView refreshControl={<RefreshControl refreshing={loading || catalogLoading} onRefresh={() => { void load(); void loadCatalog(); }} tintColor={colors.primary} />}
      contentContainerStyle={{ paddingTop: 62, paddingBottom: 32, gap: 22 }}>
      <SearchBar placeholder="Tìm công thức, nguyên liệu…" value={search} onChangeText={setSearch} onSubmit={() => setSearch(search.trim())} actionLabel="Tìm" />
      <BrandPanel asset={assets.imgContainer3} eyebrow="AI SMART CHEF" title="Nấu gì hôm nay với tủ lạnh của bạn?"
        description="Tìm công thức từ nguyên liệu sẵn có hoặc hồ sơ ăn uống của bạn. Chọn cách gợi ý trong phần cá nhân hóa bên dưới.">
        <PrimaryButton title={suggesting ? "Đang tìm món phù hợp…" : "Tìm món cho tôi"} icon="chef-hat"
          disabled={suggesting || (requiresPantry && (loading || !loaded || !pantry.length))} onPress={suggest} />
        {loaded && !pantry.length ? <Text style={{ color: colors.onDarkMuted, fontSize: 12 }}>{requiresPantry ? "Thêm nguyên liệu vào kho hoặc chọn gợi ý theo hồ sơ." : "Tủ đang trống. Bạn vẫn có thể tìm món theo hồ sơ đã lưu."}</Text> : null}
      </BrandPanel>
      <View style={{ height: 0, zIndex: 2 }}><AiChefChat style={{ position: "absolute", top: -48, left: 0 }} /></View>
      {error ? <><ExpiryAlertCard title={error} tone="danger" /><PrimaryButton title="Tải lại tủ thực phẩm" variant="outline" onPress={load} disabled={loading || suggesting} /></> : null}
      <View style={{ gap: 12 }}>
        <SectionHeading title="Gợi ý cho bữa ăn của bạn" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {["Tất cả", "Nhanh dưới 20 phút", "Dễ thực hiện"].map(label => <CategoryChip key={label} label={label} active={category === label} onPress={() => setCategory(label)} />)}
        </ScrollView>
        {catalogError ? <><ExpiryAlertCard title={catalogError} tone="danger" /><PrimaryButton title="Tải lại công thức" variant="outline" onPress={loadCatalog} /></> : null}
        {catalogLoading && !recipes.length ? <ActivityIndicator color={colors.primary} style={{ padding: 24 }} /> : displayed.length ?
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
            {displayed.map(r => <MealCard key={r.id} compact meal={{ id: r.id, name: r.name, image: r.imageUrl, calories: null,
              time: r.cookingTimeMinutes + " phút", matchPercent: null, difficulty: (r.difficulty || "").toLowerCase() === "easy" ? "Dễ nấu" : "Khám phá",
              availableIngredients: [], missingIngredients: [], steps: [] } satisfies Meal}
              onPress={() => navigation.navigate("RecipeDetail", { recipeId: r.id })} />)}
          </ScrollView> : !catalogError ? <Text style={{ color: colors.muted, lineHeight: 21 }}>{search || category !== "Tất cả" ? "Chưa tìm thấy món phù hợp. Thử đổi từ khóa hoặc bộ lọc." : "Chưa có công thức để hiển thị."}</Text> : null}
      </View>
      <View pointerEvents={suggesting ? "none" : "auto"} style={{ gap: 12, opacity: suggesting ? 0.65 : 1 }}><SectionHeading title="Cá nhân hóa bữa ăn" />
        <ActionRow icon="account-heart-outline" title="Hồ sơ ăn uống" subtitle="Chỉnh sửa mục tiêu, chế độ ăn và dị ứng" onPress={() => navigation.navigate("ProfileSetup", { editing: true })} />
        <SelectField label="Số món gợi ý" value={topK} onValueChange={setTopK} disabled={suggesting} options={[{ value: "5", label: "5 món · chọn nhanh" }, { value: "10", label: "10 món · nhiều lựa chọn" }]} />
        <SelectField label="Cách gợi ý" value={mode} disabled={suggesting} onValueChange={v => setMode(v as NonNullable<PersonalizedRecommendationOptions["mode"]>)} options={[
          { value: "AUTO", label: "Tự động" }, { value: "PANTRY_BASED", label: "Theo tủ thực phẩm" }, { value: "PROFILE_BASED", label: "Theo hồ sơ ăn uống" }
        ]} />
        <SelectField label="Bữa ăn" value={mealType} onValueChange={setMealType} disabled={suggesting} options={[
          { value: "", label: "Không giới hạn" }, { value: "BREAKFAST", label: "Bữa sáng" }, { value: "LUNCH", label: "Bữa trưa" }, { value: "DINNER", label: "Bữa tối" }
        ]} />
        <SelectField label="Thời gian nấu tối đa" value={cookTime} onValueChange={setCookTime} disabled={suggesting} options={[
          { value: "", label: "Không giới hạn" }, ...[15, 30, 45, 60].map(value => ({ value: String(value), label: `${value} phút` }))
        ]} />
        <SelectField label="Số khẩu phần" value={servings} onValueChange={setServings} disabled={suggesting} options={[1, 2, 4, 6].map(value => ({ value: String(value), label: `${value} người` }))} />
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 19 }}>Lưu hồ sơ ăn uống để dùng gợi ý cá nhân hóa. Kiểm tra thành phần thực tế trước khi nấu; dữ liệu món có thể chưa đầy đủ.</Text>
      </View>
      {loaded ? <View style={{ backgroundColor: colors.surface, padding: 18, borderRadius: 12, gap: 12 }}>
        <SectionHeading title="Có sẵn trong tủ" action="Xem kho" onPress={() => navigation.navigate("Pantry")} />
        {pantry.length ? pantry.slice(0, 6).map(p => <View key={p.id} style={{ flexDirection: "row", gap: 12, justifyContent: "space-between" }}>
          <Text style={{ color: colors.text, flex: 1 }}>{p.ingredientName || "Nguyên liệu"}</Text><Text style={{ color: colors.primaryDark }}>{p.quantity} {p.unit}</Text>
        </View>) : <Text style={{ color: colors.muted }}>Tủ đang trống. Thêm nguyên liệu để tìm món.</Text>}
        <PrimaryButton title="Thêm từ ảnh / hóa đơn" variant="soft" onPress={() => navigation.navigate("PantryImport")} />
        <PrimaryButton title="Thêm nguyên liệu thủ công" variant="outline" onPress={() => navigation.navigate("AddIngredient")} />
      </View> : null}
      <PrimaryButton title="Tự chọn / nhập nguyên liệu" icon="pencil-outline" variant="soft" onPress={() => navigation.navigate("ManualMealSuggestion")} />
      <PrimaryButton title="Tạo công thức" icon="notebook-edit-outline" variant="outline" onPress={() => navigation.navigate("CreateRecipe")} />
    </ScrollView>
  </SafeAreaView>;
}
