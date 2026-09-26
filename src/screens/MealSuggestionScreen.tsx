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
import AppBackButton from "@/components/AppBackButton";
import SearchBar from "@/components/SearchBar";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";
import { getFriendlyErrorMessage } from "@/utils/localize";

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
  const [showExtraPicker, setShowExtraPicker] = useState(true);
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
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa tải được nguyên liệu."));
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
  const pantryByIngredientId = useMemo(() => new Map(pantryItems.map((item) => [item.ingredientId, item])), [pantryItems]);
  const extraIngredientIds = useMemo(() => new Set(extraIngredients.map((item) => item.ingredientId)), [extraIngredients]);
  const pantrySearchIngredients = useMemo(() => pantryItems.map(pantryToSearchIngredient), [pantryItems]);
  const selectedIngredients = useMemo(() => [...pantrySearchIngredients, ...extraIngredients], [extraIngredients, pantrySearchIngredients]);

  const filteredIngredients = useMemo(() => {
    const keyword = normalizeText(searchText);
    const pool = keyword
      ? ingredients.filter((ingredient) => normalizeText(`${ingredient.name} ${ingredient.normalizedName} ${ingredient.category}`).includes(keyword))
      : ingredients.slice(0, 24);
    return pool.filter((ingredient) => !pantryIngredientIds.has(ingredient.id)).slice(0, 40);
  }, [ingredients, pantryIngredientIds, searchText]);

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
      setErrorMessage(getFriendlyErrorMessage(error, "Chưa tạo được gợi ý món. Vui lòng thử lại."));
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
          <AppBackButton onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"))} />
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

        <View style={{ flexDirection: "row", gap: 8 }}>
          <StepCard number="1" label="Kiểm tra tủ" complete={pantrySearchIngredients.length > 0} />
          <StepCard number="2" label="Chọn thêm" complete={extraIngredients.length > 0} />
          <StepCard number="3" label="Nhận gợi ý" complete={false} />
        </View>

        {isLoading && pantryItems.length === 0 && ingredients.length === 0 ? (
          <View style={{ minHeight: 110, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", gap: 10 }}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={{ color: colors.muted, fontWeight: "800" }} selectable>
              Đang kiểm tra nguyên liệu trong tủ...
            </Text>
          </View>
        ) : null}

        <IngredientSection
          title="1. Có sẵn trong tủ"
          count={pantrySearchIngredients.length}
          emptyText="Tủ đang trống. Hãy chọn thêm nguyên liệu bên dưới để vẫn có thể gợi ý món."
        >
          {pantrySearchIngredients.map((item) => {
            const pantryItem = pantryByIngredientId.get(item.ingredientId);
            return <SelectedIngredientCard key={item.ingredientId} item={item} meta={pantryItem ? formatStorage(pantryItem.storageLocation) : "Tủ lạnh"} />;
          })}
        </IngredientSection>

        <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }} selectable>
                2. Chọn thêm nguyên liệu
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: 3 }} selectable>
                Không bắt buộc · chỉ dùng cho lần gợi ý này
              </Text>
            </View>
            <Pressable onPress={() => setShowExtraPicker((current) => !current)} hitSlop={8} style={{ minHeight: 38, paddingHorizontal: 12, borderRadius: 19, backgroundColor: "rgba(244,162,28,0.18)", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5 }}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }} selectable>
                {extraIngredients.length > 0 ? `${extraIngredients.length} đã chọn` : showExtraPicker ? "Thu gọn" : "Mở danh sách"}
              </Text>
              <Ionicons name={showExtraPicker ? "chevron-up" : "chevron-down"} size={15} color={colors.primary} />
            </Pressable>
          </View>
          {showExtraPicker ? (
            <>
              <SearchBar placeholder="Tìm nguyên liệu bên ngoài tủ" value={searchText} onChangeText={setSearchText} />
              <View style={{ gap: 10 }}>
                {filteredIngredients.length === 0 && !isLoading ? (
                  <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 }} selectable>
                    Không tìm thấy nguyên liệu phù hợp.
                  </Text>
                ) : null}
                {filteredIngredients.map((ingredient) => (
                  <IngredientOption
                    key={ingredient.id}
                    ingredient={ingredient}
                    inPantry={false}
                    selected={extraIngredientIds.has(ingredient.id)}
                    onPress={() => toggleExtraIngredient(ingredient)}
                  />
                ))}
              </View>
            </>
          ) : null}
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
          {count} nguyên liệu
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

function StepCard({ number, label, complete }: { number: string; label: string; complete: boolean }) {
  return (
    <View style={{ flex: 1, minHeight: 68, borderRadius: 12, padding: 10, backgroundColor: complete ? "rgba(57,217,138,0.18)" : colors.card, borderWidth: 1, borderColor: complete ? `${colors.success}88` : colors.line, gap: 5 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: complete ? colors.success : colors.primary }}>
        <Text style={{ color: colors.textDark, fontSize: 11, fontWeight: "900" }}>{complete ? "✓" : number}</Text>
      </View>
      <Text numberOfLines={2} style={{ color: colors.text, fontSize: 11, lineHeight: 14, fontWeight: "900" }}>
        {label}
      </Text>
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
