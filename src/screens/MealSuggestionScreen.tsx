import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Ingredient } from "@/api/ingredients";
import { ingredientsApi } from "@/api/ingredients";
import type { MealRecommendation, SelectedIngredientPayload } from "@/api/recommendations";
import { recommendationsApi } from "@/api/recommendations";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

type SelectedIngredient = SelectedIngredientPayload & {
  name: string;
  category: string;
};

function getIngredientUnit(ingredient: Ingredient) {
  return ingredient.defaultUnit || ingredient.unit || "g";
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

function formatPercent(score: number) {
  const normalizedScore = score > 1 ? score : score * 100;
  return Math.max(0, Math.min(100, Math.round(normalizedScore)));
}

export default function MealSuggestionScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const displayName = user?.fullName || "bạn";
  const [searchText, setSearchText] = useState("");
  const [freeText, setFreeText] = useState("");
  const [topK, setTopK] = useState(5);
  const [ingredientResults, setIngredientResults] = useState<Ingredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);
  const [recommendations, setRecommendations] = useState<MealRecommendation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const keyword = searchText.trim();
    let isActive = true;

    if (keyword.length < 2) {
      setIngredientResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const page = await ingredientsApi.search(keyword, 1, 10);
        if (isActive) {
          setIngredientResults(page.data.filter((ingredient) => matchesIngredientSearch(ingredient, keyword)));
        }
      } catch (error) {
        if (isActive) {
          setIngredientResults([]);
          setErrorMessage(error instanceof Error ? error.message : "Chưa tìm được nguyên liệu.");
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
  }, [searchText]);

  const selectedIds = useMemo(() => new Set(selectedIngredients.map((item) => item.ingredientId)), [selectedIngredients]);

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
          unit: getIngredientUnit(ingredient)
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

  const validateRequest = useCallback(() => {
    if (!user?.userId) return "Bạn cần đăng nhập để nhận gợi ý món.";
    if (selectedIngredients.length === 0 && !freeText.trim()) return "Chọn ít nhất một nguyên liệu hoặc nhập nguyên liệu thủ công.";

    const invalidIndex = selectedIngredients.findIndex((item) => item.quantity <= 0 || !Number.isFinite(item.quantity));
    if (invalidIndex >= 0) return `${selectedIngredients[invalidIndex].name}: số lượng phải lớn hơn 0.`;

    const missingUnitIndex = selectedIngredients.findIndex((item) => !item.unit.trim());
    if (missingUnitIndex >= 0) return `${selectedIngredients[missingUnitIndex].name}: đơn vị không được để trống.`;

    return "";
  }, [freeText, selectedIngredients, user?.userId]);

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
        userId: user!.userId,
        inputIngredientText: freeText.trim(),
        ingredients: [],
        selectedIngredients: selectedIngredients.map(({ ingredientId, quantity, unit }) => ({
          ingredientId,
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
  }, [freeText, selectedIngredients, topK, user, validateRequest]);

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

        {searchText.trim().length >= 2 ? (
          <View style={{ gap: 8 }}>
            {ingredientResults.length === 0 && !isSearching ? (
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 19 }} selectable>
                Không tìm thấy nguyên liệu phù hợp. Bạn có thể thử từ khóa khác hoặc nhập nguyên liệu thủ công.
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
                      borderRadius: 12,
                      backgroundColor: isSelected ? "rgba(57,217,138,0.18)" : colors.white,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      opacity: pressed ? 0.82 : 1
                    })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textDark, fontSize: 14, fontWeight: "900" }} selectable>
                        {ingredient.name}
                      </Text>
                      <Text style={{ color: colors.mutedDark, fontSize: 11, fontWeight: "800", marginTop: 2 }} selectable>
                        {ingredient.category || "Nguyên liệu"} · {getIngredientUnit(ingredient)}
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
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textDark, fontSize: 16, fontWeight: "900" }} selectable>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.mutedDark, fontSize: 11, fontWeight: "800", marginTop: 2 }} selectable>
                    {item.category || "Nguyên liệu"}
                  </Text>
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
        refreshControl={<RefreshControl refreshing={isSuggesting} onRefresh={requestRecommendations} tintColor={colors.primary} />}
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
