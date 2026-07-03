import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import type { PantryApiItem } from "@/api/pantry";
import { pantryApi } from "@/api/pantry";
import { recommendationsApi } from "@/api/recommendations";
import SearchBar from "@/components/SearchBar";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";

type PantryDisplayItem = PantryApiItem & {
  ingredient?: Ingredient;
};

type SearchIngredient = {
  ingredientId: string;
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  imageUrl?: string | null;
  source: "pantry" | "extra";
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatStorage(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("pantry") || normalized.includes("bep") || normalized.includes("bếp")) return "Kệ bếp";
  if (normalized.includes("freeze") || normalized.includes("dong") || normalized.includes("đông")) return "Ngăn đông";
  return "Tủ lạnh";
}

function formatPantryName(item: PantryDisplayItem) {
  return item.ingredientName || item.ingredient?.name || item.note || "Nguyên liệu";
}

function pantryToSearchIngredient(item: PantryDisplayItem): SearchIngredient {
  return {
    ingredientId: item.ingredientId,
    name: formatPantryName(item),
    category: item.ingredient?.category,
    quantity: item.quantity,
    unit: item.unit,
    imageUrl: item.ingredient?.imageUrl,
    source: "pantry"
  };
}

function ingredientToExtra(ingredient: Ingredient): SearchIngredient {
  return {
    ingredientId: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    quantity: 1,
    unit: ingredient.defaultUnit || ingredient.unit || "piece",
    imageUrl: ingredient.imageUrl,
    source: "extra"
  };
}

export default function MealSuggestionScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const displayName = user?.fullName || "bạn";
  const [pantryItems, setPantryItems] = useState<PantryDisplayItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [extraIngredients, setExtraIngredients] = useState<SearchIngredient[]>([]);
  const [searchText, setSearchText] = useState("");
  const [topK, setTopK] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [ingredientPage, pantry] = await Promise.all([ingredientsApi.list(1, 100), pantryApi.list()]);
      const ingredientById = new Map(ingredientPage.data.map((ingredient) => [ingredient.id, ingredient]));
      setIngredients(ingredientPage.data);
      setPantryItems(pantry.map((item) => ({ ...item, ingredient: ingredientById.get(item.ingredientId) })));
    } catch (error) {
      setIngredients([]);
      setPantryItems([]);
      setErrorMessage(error instanceof Error ? error.message : "Chưa tải được nguyên liệu.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const pantryIngredientIds = useMemo(() => new Set(pantryItems.map((item) => item.ingredientId)), [pantryItems]);
  const extraIngredientIds = useMemo(() => new Set(extraIngredients.map((item) => item.ingredientId)), [extraIngredients]);
  const pantrySearchIngredients = useMemo(() => pantryItems.map(pantryToSearchIngredient), [pantryItems]);
  const selectedIngredients = useMemo(() => [...pantrySearchIngredients, ...extraIngredients], [extraIngredients, pantrySearchIngredients]);

  const filteredIngredients = useMemo(() => {
    const keyword = normalizeText(searchText);
    const pool = keyword
      ? ingredients.filter((ingredient) => normalizeText(`${ingredient.name} ${ingredient.normalizedName} ${ingredient.category}`).includes(keyword))
      : ingredients.slice(0, 24);
    return pool;
  }, [ingredients, searchText]);

  const toggleExtraIngredient = (ingredient: Ingredient) => {
    if (pantryIngredientIds.has(ingredient.id)) {
      setErrorMessage(`${ingredient.name} đã có sẵn trong tủ và đã được tự động dùng để gợi ý.`);
      return;
    }

    setErrorMessage("");
    setExtraIngredients((current) => {
      if (current.some((item) => item.ingredientId === ingredient.id)) {
        return current.filter((item) => item.ingredientId !== ingredient.id);
      }
      return [...current, ingredientToExtra(ingredient)];
    });
  };

  const removeExtraIngredient = (ingredientId: string) => {
    setExtraIngredients((current) => current.filter((item) => item.ingredientId !== ingredientId));
  };

  const requestRecommendations = async () => {
    if (selectedIngredients.length === 0) {
      setErrorMessage("Bạn cần có ít nhất một nguyên liệu trước khi gợi ý.");
      return;
    }

    setIsSuggesting(true);
    setErrorMessage("");
    try {
      const ingredientNames = selectedIngredients.map((item) => item.name);
      const response = await recommendationsApi.suggestMeals({
        topK,
        inputIngredientText: ingredientNames.join(", "),
        ingredients: ingredientNames,
        selectedIngredients: selectedIngredients.map((item) => ({
          ingredientId: item.ingredientId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit
        }))
      });

      navigation.navigate("MealRecommendationResults", {
        recommendations: response.recommendations ?? [],
        pantryItems: selectedIngredients.map((item) => ({
          id: `${item.source}-${item.ingredientId}`,
          ingredientId: item.ingredientId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          imageUrl: item.imageUrl || null,
          source: item.source
        }))
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa tạo được gợi ý món. Vui lòng thử lại.");
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 22, paddingBottom: 156, gap: 18 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"))} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }} selectable>
              Quay lại
            </Text>
          </Pressable>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="chef-hat" size={28} color={colors.primary} />
          </View>
        </View>

        <View>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }} selectable>
            Tìm công thức cho {displayName}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700", lineHeight: 21, marginTop: 4 }} selectable>
            Nguyên liệu trong tủ được tự động chọn. Bạn có thể chọn thêm nguyên liệu bên ngoài cho riêng lần gợi ý này.
          </Text>
        </View>

        <IngredientSection
          title="Tự động từ tủ lạnh"
          count={pantrySearchIngredients.length}
          emptyText="Tủ đang trống. Hãy chọn thêm nguyên liệu bên dưới để vẫn có thể gợi ý món."
        >
          {pantrySearchIngredients.map((item) => {
            const pantryItem = pantryItems.find((pantry) => pantry.ingredientId === item.ingredientId);
            return <SelectedIngredientCard key={item.ingredientId} item={item} meta={pantryItem ? formatStorage(pantryItem.storageLocation) : "Tủ lạnh"} />;
          })}
        </IngredientSection>

        <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }} selectable>
              Chọn thêm ngoài tủ
            </Text>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "900" }} selectable>
              {extraIngredients.length} đã chọn
            </Text>
          </View>
          <SearchBar placeholder="Tìm nguyên liệu có sẵn" value={searchText} onChangeText={setSearchText} />
          <View style={{ gap: 10 }}>
            {filteredIngredients.map((ingredient) => (
              <IngredientOption
                key={ingredient.id}
                ingredient={ingredient}
                inPantry={pantryIngredientIds.has(ingredient.id)}
                selected={extraIngredientIds.has(ingredient.id)}
                onPress={() => toggleExtraIngredient(ingredient)}
              />
            ))}
          </View>
        </View>

        {extraIngredients.length > 0 ? (
          <IngredientSection title="Nguyên liệu thêm tạm thời" count={extraIngredients.length}>
            {extraIngredients.map((item) => (
              <SelectedIngredientCard key={item.ingredientId} item={item} meta="Chỉ dùng cho lần gợi ý này" onRemove={() => removeExtraIngredient(item.ingredientId)} />
            ))}
          </IngredientSection>
        ) : null}

        <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }} selectable>
              Số món muốn gợi ý
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[5, 10].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setTopK(value)}
                  style={{
                    width: 48,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: topK === value ? colors.primary : "rgba(255,255,255,0.12)",
                    borderWidth: 1,
                    borderColor: topK === value ? colors.primary : colors.line
                  }}
                >
                  <Text style={{ color: topK === value ? colors.textDark : colors.text, fontSize: 13, fontWeight: "900" }} selectable>
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {errorMessage ? (
            <Text style={{ color: "#FFE6E6", fontWeight: "800", lineHeight: 20 }} selectable>
              {errorMessage}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View style={{ position: "absolute", left: 18, right: 18, bottom: 112, borderRadius: 30, backgroundColor: "rgba(17,32,28,0.92)", padding: 8, borderWidth: 1, borderColor: colors.line, boxShadow: "0 12px 28px rgba(0,0,0,0.34)" }}>
        <Pressable
          onPress={requestRecommendations}
          disabled={isSuggesting || isLoading || selectedIngredients.length === 0}
          style={({ pressed }) => ({
            minHeight: 56,
            borderRadius: 28,
            backgroundColor: selectedIngredients.length === 0 ? "rgba(255,255,255,0.22)" : colors.primary,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
            opacity: pressed || isSuggesting || isLoading ? 0.78 : 1
          })}
        >
          {isSuggesting ? <ActivityIndicator color={colors.textDark} /> : <Ionicons name="sparkles" size={22} color={selectedIngredients.length === 0 ? colors.muted : colors.textDark} />}
          <Text style={{ color: selectedIngredients.length === 0 ? colors.muted : colors.textDark, fontSize: 16, fontWeight: "900" }} selectable>
            {isSuggesting ? "Đang gợi ý..." : `Gợi ý từ ${selectedIngredients.length} nguyên liệu`}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function IngredientSection({ title, count, emptyText, children }: { title: string; count: number; emptyText?: string; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }} selectable>
          {title}
        </Text>
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "900" }} selectable>
          {count} món
        </Text>
      </View>
      {count === 0 ? (
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 }} selectable>
          {emptyText || "Chưa có nguyên liệu."}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>{children}</View>
      )}
    </View>
  );
}

function SelectedIngredientCard({ item, meta, onRemove }: { item: SearchIngredient; meta: string; onRemove?: () => void }) {
  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Image source={{ uri: normalizeRemoteImageUrl(item.imageUrl || FALLBACK_FOOD_IMAGE_URL) }} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: colors.secondary }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textDark, fontSize: 15, fontWeight: "900" }} selectable>
          {item.name}
        </Text>
        <Text style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "800", marginTop: 2 }} selectable>
          {item.quantity} {item.unit} · {item.category || "Nguyên liệu"} · {meta}
        </Text>
      </View>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={10}>
          <Ionicons name="close-circle" size={24} color={colors.danger} />
        </Pressable>
      ) : (
        <MaterialCommunityIcons name="fridge-outline" size={22} color={colors.primary} />
      )}
    </View>
  );
}

function IngredientOption({ ingredient, selected, inPantry, onPress }: { ingredient: Ingredient; selected: boolean; inPantry: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderWidth: 2,
        borderColor: inPantry ? colors.success : selected ? colors.primary : "transparent",
        opacity: pressed ? 0.86 : 1
      })}
    >
      <Image source={{ uri: normalizeRemoteImageUrl(ingredient.imageUrl || FALLBACK_FOOD_IMAGE_URL) }} style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: colors.secondary }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textDark, fontSize: 16, fontWeight: "900" }} selectable>
          {ingredient.name}
        </Text>
        <Text style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "800", marginTop: 2 }} selectable>
          {ingredient.category || "Nguyên liệu"} · đơn vị {ingredient.defaultUnit || ingredient.unit || "piece"}
        </Text>
      </View>
      <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: inPantry ? `${colors.success}24` : selected ? colors.primary : colors.secondary }}>
        <Ionicons name={inPantry ? "checkmark" : selected ? "remove" : "add"} size={18} color={inPantry ? colors.success : selected ? colors.textDark : colors.primaryDark} />
      </View>
    </Pressable>
  );
}
