import Text from "@/components/AppText";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FlatList, Image, Pressable, View } from "react-native";
import { useEffect, useState } from "react";
import { recipesApi } from "@/api/recipes";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MealRecommendation } from "@/api/recommendations";
import { colors } from "@/constants/colors";
import type { RootStackParamList } from "@/types";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";

type Props = NativeStackScreenProps<RootStackParamList, "MealRecommendationResults">;
type UsedIngredient = RootStackParamList["MealRecommendationResults"]["pantryItems"][number];

function formatPercent(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export default function MealRecommendationResultsScreen({ route, navigation }: Props) {
  const [recommendations, setRecommendations] = useState(route.params.recommendations);
  useEffect(() => {
    let active = true;
    setRecommendations(route.params.recommendations);
    if (!route.params.recommendations.some(r => r.recipeId && (r.name === "Món được gợi ý" || !r.imageUrl))) return;
    void recipesApi.all().then(catalog => {
      if (!active) return;
      const recipes = new Map(catalog.map(r => [r.id, r]));
      setRecommendations(route.params.recommendations.map(r => {
        const recipe = recipes.get(r.recipeId);
        return recipe ? { ...r, name: r.name === "Món được gợi ý" ? recipe.name : r.name, imageUrl: r.imageUrl || recipe.imageUrl } : r;
      }));
    }).catch(() => { /* Keep the successful recommendation response available. */ });
    return () => { active = false; };
  }, [route.params.recommendations]);
  const pantryItems = route.params.pantryItems;
  const mode = route.params.mode;
  const description = mode === "PROFILE_BASED" ? "Dựa trên hồ sơ ăn uống và các bộ lọc đã chọn."
    : mode === "AUTO" ? "Dựa trên hồ sơ ăn uống, nguyên liệu có sẵn và các bộ lọc đã chọn."
    : mode === "PANTRY_BASED" ? "Dựa trên nguyên liệu trong tủ và các bộ lọc đã chọn."
    : "Dựa trên nguyên liệu bạn đã nhập hoặc lựa chọn.";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["left", "right", "bottom"]}>
      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.mealId}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, paddingBottom: 42, gap: 14, maxWidth: 900, width: "100%", alignSelf: "center" }}
        ListHeaderComponent={
          <View style={{ gap: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>

              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={colors.primary} />
              </View>
            </View>

            <View>
              <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700" }} selectable>
                Danh sách món gợi ý
              </Text>
              <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700", lineHeight: 21, marginTop: 4 }} selectable>
                {description}
              </Text>
            </View>

            {pantryItems.length > 0 ? <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 10 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }} selectable>
                {mode ? "Nguyên liệu trong tủ" : "Nguyên liệu đã chọn"}
              </Text>
              <View style={{ gap: 10 }}>
                {pantryItems.map((item) => (
                  <IngredientSummaryRow key={item.id || item.ingredientId} item={item} />
                ))}
              </View>
            </View> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700" }} selectable>
              Chưa có món phù hợp
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 }} selectable>
              Kiểm tra nguyên liệu trong tủ và hồ sơ ăn uống rồi thử lại. Danh mục có thể chưa có món phù hợp.
            </Text>
          </View>
        }
        renderItem={({ item }) => <RecommendationCard recommendation={item} onPress={() => navigation.navigate("RecipeDetail", { mealId: item.persistedMeal ? item.mealId : undefined, recipeId: item.recipeId, recommendationId: item.recommendationId })} />}
      />
    </SafeAreaView>
  );
}

function IngredientSummaryRow({ item }: { item: UsedIngredient }) {
  const sourceLabel = item.source === "extra" ? "Thêm tạm thời" : "Trong tủ";

  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Image source={{ uri: normalizeRemoteImageUrl(item.imageUrl || FALLBACK_FOOD_IMAGE_URL) }} style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: colors.secondary }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textDark, fontSize: 14, fontWeight: "700" }} selectable>
          {item.name}
        </Text>
        <Text style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "600", marginTop: 2 }} selectable>
          {item.quantity} {item.unit} · {sourceLabel}
        </Text>
      </View>
    </View>
  );
}

function RecommendationCard({ recommendation, onPress }: { recommendation: MealRecommendation; onPress: () => void }) {
  const matchPercent = formatPercent(recommendation.score);
  const imageUrl = recommendation.imageUrl || FALLBACK_FOOD_IMAGE_URL;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem ${recommendation.name}`}
      disabled={!recommendation.recipeId}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 14,
        gap: 12,
        opacity: pressed ? 0.88 : 1,
        boxShadow: "0 2px 8px rgba(0,48,20,0.06)",
        transform: [{ scale: pressed ? 0.99 : 1 }]
      })}
    >
      <View style={{ width: "100%", height: 154, borderRadius: 10, overflow: "hidden", backgroundColor: colors.secondary }}>
        <Image
          source={{ uri: normalizeRemoteImageUrl(imageUrl) }}
          resizeMode="cover"
          style={{ width: "100%", height: "100%" }}
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textDark, fontSize: 20, fontWeight: "700", lineHeight: 25 }} selectable>
            {recommendation.name}
          </Text>
          <Text style={{ color: colors.mutedDark, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 5 }} selectable>
            {recommendation.description}
          </Text>
        </View>
        <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.secondary }}>
          <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "700" }} selectable>
            {matchPercent}%
          </Text>
        </View>
      </View>

      <IngredientLine title="Đã có" items={recommendation.matchedIngredients} tone="success" />
      <IngredientLine title="Còn thiếu" items={recommendation.missingIngredients} tone="warning" />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ color: colors.primaryDark, fontSize: 13, fontWeight: "700" }} selectable>
          {recommendation.recipeId ? "Xem công thức và nguyên liệu thiếu" : "Chưa có công thức liên kết"}
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
      <Text style={{ color: colors.textDark, fontSize: 13, fontWeight: "700" }} selectable>
        {title}
      </Text>
      {items.length === 0 ? (
        <Text style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "700" }} selectable>
          Chưa có dữ liệu
        </Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
          {items.map((item) => (
            <View key={item} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: `${color}24` }}>
              <Text style={{ color: colors.textDark, fontSize: 12, fontWeight: "600" }} selectable>
                {item}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
