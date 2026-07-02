import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import type { MealRecommendation, SelectedIngredientPayload } from "@/api/recommendations";
import { recommendationsApi } from "@/api/recommendations";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { authStorage } from "@/utils/authStorage";

type SelectedIngredient = SelectedIngredientPayload & {
  name: string;
  category: string;
  imageUrl?: string | null;
};

const ingredientFallbackImage = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80";

function getIngredientUnit(ingredient: Ingredient) {
  return ingredient.defaultUnit || ingredient.unit || "g";
}

function getIngredientImageUrl(imageUrl?: string | null) {
  const cleanUrl = imageUrl?.trim();
  if (!cleanUrl) return ingredientFallbackImage;
  return cleanUrl;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesIngredientSearch(ingredient: Ingredient, search: string) {
  const keyword = normalizeText(search);
  if (!keyword) return true;

  return [ingredient.name, ingredient.normalizedName, ingredient.category].some((value) => normalizeText(value || "").includes(keyword));
}

function uniqueTextItems(items: string[]) {
  const seen = new Set<string>();
  return items
    .map((item) => item.trim())
    .filter((item) => {
      const key = normalizeText(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function splitFreeText(value: string) {
  return uniqueTextItems(value.split(/[,;\n/|]+/));
}

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const decoded =
      typeof atob === "function"
        ? atob(padded)
        : "";
    if (!decoded) return null;
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getUserIdFromToken(token: string | null) {
  if (!token) return "";
  const payload = decodeJwtPayload(token);
  const claimValue =
    payload?.userId ||
    payload?.nameid ||
    payload?.sub ||
    payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
  return typeof claimValue === "string" ? claimValue : "";
}

function formatPercent(score: number) {
  const normalizedScore = score > 1 ? score : score * 100;
  return Math.max(0, Math.min(100, Math.round(normalizedScore)));
}

export default function MealSuggestionScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const displayName = user?.fullName || "bạn";
  const [resolvedUserId, setResolvedUserId] = useState(user?.userId || "");
  const [searchText, setSearchText] = useState("");
  const [freeText, setFreeText] = useState("");
  const [topK, setTopK] = useState(5);
  const [ingredientCatalog, setIngredientCatalog] = useState<Ingredient[]>([]);
  const [ingredientResults, setIngredientResults] = useState<Ingredient[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [recommendations, setRecommendations] = useState<MealRecommendation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (user?.userId) {
      setResolvedUserId(user.userId);
      return;
    }

    let isActive = true;
    authStorage.getAccessToken().then((token) => {
      if (isActive) {
        setResolvedUserId(getUserIdFromToken(token));
      }
    });

    return () => {
      isActive = false;
    };
  }, [user?.userId]);

  const loadIngredientCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    setErrorMessage("");
    try {
      const page = await ingredientsApi.list(1, 100);
      setIngredientCatalog(page.data);
    } catch (error) {
      setIngredientCatalog([]);
      setErrorMessage(error instanceof Error ? error.message : "Chưa tải được danh sách nguyên liệu.");
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    loadIngredientCatalog();
  }, [loadIngredientCatalog]);

  useEffect(() => {
    const keyword = searchText.trim();
    let isActive = true;

    if (!keyword) {
      setIngredientResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const page = await ingredientsApi.search(keyword, 1, 10);
        if (isActive) {
          const apiResults = page.data.filter((ingredient) => matchesIngredientSearch(ingredient, keyword));
          const merged = new Map<string, Ingredient>();
          [...apiResults, ...ingredientCatalog.filter((ingredient) => matchesIngredientSearch(ingredient, keyword))].forEach((ingredient) => {
            merged.set(ingredient.id, ingredient);
          });
          setIngredientResults(Array.from(merged.values()).slice(0, 12));
        }
      } catch (error) {
        if (isActive) {
          const fallbackResults = ingredientCatalog.filter((ingredient) => matchesIngredientSearch(ingredient, keyword)).slice(0, 12);
          setIngredientResults(fallbackResults);
          setErrorMessage(fallbackResults.length > 0 ? "" : error instanceof Error ? error.message : "Chưa tìm được nguyên liệu.");
        }
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
      }
    }, 320);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [ingredientCatalog, searchText]);

  const selectedIds = useMemo(() => new Set(selectedIngredients.map((item) => item.ingredientId)), [selectedIngredients]);
  const displayedIngredients = useMemo(() => {
    if (searchText.trim()) return ingredientResults;
    return ingredientCatalog.slice(0, 16);
  }, [ingredientCatalog, ingredientResults, searchText]);
  const isShowingSearchResults = Boolean(searchText.trim());

  const addIngredient = useCallback(
    (ingredient: Ingredient) => {
      if (selectedIds.has(ingredient.id)) return;

      setSelectedIngredients((current) => [
        ...current,
        {
          ingredientId: ingredient.id,
          name: ingredient.name,
          category: ingredient.category,
          quantity: 1,
          unit: getIngredientUnit(ingredient),
          imageUrl: ingredient.imageUrl
        }
      ]);
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

  const toggleIngredient = useCallback(
    (ingredient: Ingredient) => {
      if (selectedIds.has(ingredient.id)) {
        removeSelectedIngredient(ingredient.id);
        return;
      }

      addIngredient(ingredient);
    },
    [addIngredient, removeSelectedIngredient, selectedIds]
  );

  const validateRequest = useCallback(() => {
    if (!resolvedUserId) return "Phiên đăng nhập chưa có userId. Vui lòng đăng xuất rồi đăng nhập lại.";
    if (selectedIngredients.length === 0 && !freeText.trim()) return "Chọn ít nhất một nguyên liệu hoặc nhập nguyên liệu thủ công.";

    const invalidIndex = selectedIngredients.findIndex((item) => item.quantity <= 0 || !Number.isFinite(item.quantity));
    if (invalidIndex >= 0) return `${selectedIngredients[invalidIndex].name}: số lượng phải lớn hơn 0.`;

    const missingUnitIndex = selectedIngredients.findIndex((item) => !item.unit.trim());
    if (missingUnitIndex >= 0) return `${selectedIngredients[missingUnitIndex].name}: đơn vị không được để trống.`;

    return "";
  }, [freeText, resolvedUserId, selectedIngredients]);

  const requestRecommendations = useCallback(async () => {
    const validationMessage = validateRequest();
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setIsSuggesting(true);
    setErrorMessage("");
    try {
      const response = await recommendationsApi.suggestMeals({
        userId: resolvedUserId,
        inputIngredientText: uniqueTextItems([...selectedIngredients.map((item) => item.name), ...splitFreeText(freeText)]).join(", "),
        ingredients: uniqueTextItems([...selectedIngredients.map((item) => item.name), ...splitFreeText(freeText)]),
        selectedIngredients: selectedIngredients.map(({ ingredientId, name, quantity, unit }) => ({
          ingredientId,
          name,
          quantity,
          unit: unit.trim()
        })),
        candidateRecipes: [],
        topK
      });

      setRecommendations(response.recommendations ?? []);
    } catch (error) {
      setRecommendations([]);
      setErrorMessage(error instanceof Error ? error.message : "Chưa tạo được gợi ý món. Vui lòng thử lại.");
    } finally {
      setIsSuggesting(false);
    }
  }, [freeText, resolvedUserId, selectedIngredients, topK, validateRequest]);

  const refreshScreen = useCallback(async () => {
    await loadIngredientCatalog();
    if (selectedIngredients.length > 0 || freeText.trim()) {
      await requestRecommendations();
    }
  }, [freeText, loadIngredientCatalog, requestRecommendations, selectedIngredients.length]);

  const header = (
    <View style={{ gap: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home"))}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
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
          Gợi ý món cho {displayName}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700", lineHeight: 21, marginTop: 4 }} selectable>
          Chọn nguyên liệu trong hệ thống, nhập định lượng rồi để Z-Pantry tìm món phù hợp từ hệ thống.
        </Text>
      </View>

      <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 12 }}>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }} selectable>
          Nguyên liệu bạn đang có
        </Text>
        <View
          style={{
            minHeight: 50,
            borderRadius: 12,
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

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: "900" }} selectable>
              {isShowingSearchResults ? "Kết quả tìm kiếm" : "Nguyên liệu có sẵn"}
            </Text>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "900" }} selectable>
              {displayedIngredients.length} món
            </Text>
          </View>

          {isLoadingCatalog && !isShowingSearchResults ? (
            <View style={{ minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(255,255,255,0.10)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800" }} selectable>
                Đang tải nguyên liệu...
              </Text>
            </View>
          ) : displayedIngredients.length === 0 && !isSearching ? (
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 19 }} selectable>
                {isShowingSearchResults ? "Không tìm thấy nguyên liệu phù hợp. Bạn có thể thử từ khóa khác hoặc nhập nguyên liệu thủ công." : "Chưa có nguyên liệu để chọn. Kéo xuống để tải lại hoặc nhập thủ công."}
              </Text>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {displayedIngredients.map((ingredient) => (
                  <IngredientOption
                    key={ingredient.id}
                    ingredient={ingredient}
                    selected={selectedIds.has(ingredient.id)}
                    onPress={() => toggleIngredient(ingredient)}
                  />
                ))}
              </View>
            )}
        </View>

        <TextInput
          value={freeText}
          onChangeText={setFreeText}
          placeholder="Nhập thêm nguyên liệu thủ công nếu cần"
          placeholderTextColor={colors.muted}
          multiline
          style={{
            minHeight: 72,
            borderRadius: 12,
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
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
            Đã chọn
          </Text>
          <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "900" }} selectable>
            {selectedIngredients.length} nguyên liệu
          </Text>
        </View>

        {selectedIngredients.length === 0 ? (
          <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 6 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "900" }} selectable>
              Chưa chọn nguyên liệu
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 19 }} selectable>
              Tìm trong hệ thống rồi bấm dấu cộng để thêm định lượng.
            </Text>
          </View>
        ) : (
          selectedIngredients.map((item) => (
            <View key={item.ingredientId} style={{ backgroundColor: colors.white, borderRadius: 12, padding: 12, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <RemoteIngredientImage uri={item.imageUrl} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.secondary }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textDark, fontSize: 16, fontWeight: "900" }} selectable>
                      {item.name}
                    </Text>
                    <Text style={{ color: colors.mutedDark, fontSize: 11, fontWeight: "800", marginTop: 2 }} selectable>
                      {item.category || "Nguyên liệu"}
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => removeSelectedIngredient(item.ingredientId)} hitSlop={10}>
                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TextInput
                  value={String(item.quantity)}
                  onChangeText={(value) => updateSelectedIngredient(item.ingredientId, { quantity: Number(value.replace(",", ".")) || 0 })}
                  keyboardType="decimal-pad"
                  placeholder="Số lượng"
                  placeholderTextColor={colors.mutedDark}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#DCE8DD",
                    color: colors.textDark,
                    fontSize: 14,
                    fontWeight: "800",
                    paddingHorizontal: 12
                  }}
                />
                <TextInput
                  value={item.unit}
                  onChangeText={(unit) => updateSelectedIngredient(item.ingredientId, { unit })}
                  placeholder="Đơn vị"
                  placeholderTextColor={colors.mutedDark}
                  style={{
                    width: 96,
                    minHeight: 44,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#DCE8DD",
                    color: colors.textDark,
                    fontSize: 14,
                    fontWeight: "800",
                    paddingHorizontal: 12
                  }}
                />
              </View>
            </View>
          ))
        )}
      </View>

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

        <Pressable
          onPress={requestRecommendations}
          disabled={isSuggesting}
          style={({ pressed }) => ({
            minHeight: 56,
            borderRadius: 28,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
            opacity: pressed || isSuggesting ? 0.78 : 1
          })}
        >
          {isSuggesting ? <ActivityIndicator color={colors.textDark} /> : <Ionicons name="sparkles" size={22} color={colors.textDark} />}
          <Text style={{ color: colors.textDark, fontSize: 16, fontWeight: "900" }} selectable>
            Gợi ý món phù hợp
          </Text>
        </Pressable>
      </View>

      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }} selectable>
        Kết quả gợi ý
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.recipeId}
        refreshControl={<RefreshControl refreshing={isSuggesting || isLoadingCatalog} onRefresh={refreshScreen} tintColor={colors.primary} />}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 22, paddingBottom: 118, gap: 14 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }} selectable>
              Hiện chưa có món phù hợp
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 }} selectable>
              Thêm nguyên liệu khác hoặc thử lại với pantry để hệ thống có nhiều dữ liệu hơn.
            </Text>
          </View>
        }
        renderItem={({ item }) => <RecommendationCard recommendation={item} onPress={() => navigation.navigate("RecipeDetail", { mealId: item.recipeId })} />}
      />
    </SafeAreaView>
  );
}

function RecommendationCard({ recommendation, onPress }: { recommendation: MealRecommendation; onPress: () => void }) {
  const matchPercent = formatPercent(recommendation.score);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 14,
        gap: 12,
        opacity: pressed ? 0.88 : 1,
        boxShadow: "0 12px 24px rgba(0,0,0,0.20)"
      })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textDark, fontSize: 20, fontWeight: "900", lineHeight: 25 }} selectable>
            {recommendation.name}
          </Text>
          <Text style={{ color: colors.mutedDark, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 5 }} selectable>
            {recommendation.description || "Món phù hợp với nguyên liệu bạn đang có."}
          </Text>
        </View>
        <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.secondary }}>
          <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "900" }} selectable>
            {matchPercent}%
          </Text>
        </View>
      </View>

      <IngredientLine title="Đã có" items={recommendation.matchedIngredients} tone="success" />
      <IngredientLine title="Còn thiếu" items={recommendation.missingIngredients} tone="warning" />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ color: colors.primaryDark, fontSize: 13, fontWeight: "900" }} selectable>
          Xem chi tiết món
        </Text>
        <Ionicons name="arrow-forward-circle" size={25} color={colors.primary} />
      </View>
    </Pressable>
  );
}

function RemoteIngredientImage({ uri, style }: { uri?: string | null; style: object }) {
  const [hasError, setHasError] = useState(false);
  const sourceUri = hasError ? ingredientFallbackImage : getIngredientImageUrl(uri);

  return <Image source={{ uri: sourceUri }} onError={() => setHasError(true)} style={style} />;
}

function IngredientOption({ ingredient, selected, onPress }: { ingredient: Ingredient; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "48%",
        minWidth: 150,
        flexGrow: 1,
        borderRadius: 14,
        backgroundColor: colors.white,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: selected ? colors.success : "transparent",
        opacity: pressed ? 0.84 : 1,
        boxShadow: "0 10px 20px rgba(0,0,0,0.16)"
      })}
    >
      <View style={{ height: 86, backgroundColor: colors.secondary }}>
        <RemoteIngredientImage uri={ingredient.imageUrl} style={{ width: "100%", height: "100%" }} />
        <View style={{ position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: selected ? colors.success : colors.primary, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={selected ? "remove" : "add"} size={20} color={colors.white} />
        </View>
        {selected ? (
          <View style={{ position: "absolute", left: 8, top: 8, borderRadius: 999, backgroundColor: "rgba(57,217,138,0.92)", paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: colors.white, fontSize: 10, fontWeight: "900" }} selectable>
              Đã chọn
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ padding: 11, gap: 7 }}>
        <Text numberOfLines={2} style={{ color: colors.textDark, fontSize: 15, fontWeight: "900", lineHeight: 19 }}>
          {ingredient.name}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          <View style={{ borderRadius: 999, backgroundColor: "#EEF3EF", paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: colors.mutedDark, fontSize: 10, fontWeight: "900" }} selectable>
              {ingredient.category || "Nguyên liệu"}
            </Text>
          </View>
          <View style={{ borderRadius: 999, backgroundColor: colors.secondary, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: colors.primaryDark, fontSize: 10, fontWeight: "900" }} selectable>
              {getIngredientUnit(ingredient)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function IngredientLine({ title, items, tone }: { title: string; items: string[]; tone: "success" | "warning" }) {
  const color = tone === "success" ? colors.success : colors.warning;

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
            <View key={item} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: `${color}24` }}>
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
