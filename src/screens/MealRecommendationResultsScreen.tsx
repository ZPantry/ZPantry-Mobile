import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FlatList, Image, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { MealRecommendation } from "@/api/recommendations";
import { colors } from "@/constants/colors";
import type { RootStackParamList } from "@/types";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";

type Props = NativeStackScreenProps<RootStackParamList, "MealRecommendationResults">;
type UsedIngredient = RootStackParamList["MealRecommendationResults"]["pantryItems"][number];

function formatPercent(score: number) {
  const normalizedScore = score > 1 ? score : score * 100;
  return Math.max(0, Math.min(100, Math.round(normalizedScore)));
}

export default function MealRecommendationResultsScreen({ route, navigation }: Props) {
  const recommendations = route.params.recommendations;
  const pantryItems = route.params.pantryItems;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.mealId}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => navigation.goBack()} tintColor={colors.primary} />}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 22, paddingBottom: 42, gap: 14 }}
        ListHeaderComponent={
          <View style={{ gap: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Pressable onPress={() => navigation.goBack()} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="chevron-back" size={28} color={colors.primary} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }} selectable>
                  Chỉnh nguyên liệu
                </Text>
              </Pressable>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={colors.primary} />
              </View>
            </View>

            <View>
              <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }} selectable>
                Danh sách món gợi ý
              </Text>
              <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700", lineHeight: 21, marginTop: 4 }} selectable>
                Dựa trên {pantryItems.length} nguyên liệu đã chọn.
              </Text>
            </View>

            <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 10 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "900" }} selectable>
                Nguyên liệu đã dùng
              </Text>
              <View style={{ gap: 10 }}>
                {pantryItems.map((item) => (
                  <IngredientSummaryRow key={item.id || item.ingredientId} item={item} />
                ))}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }} selectable>
              Chưa có món phù hợp
            </Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 }} selectable>
              Quay lại chọn thêm nguyên liệu khác rồi gợi ý lại.
            </Text>
          </View>
        }
        renderItem={({ item }) => <RecommendationCard recommendation={item} onPress={() => navigation.navigate("RecipeDetail", { mealId: item.mealId })} />}
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
        <Text style={{ color: colors.textDark, fontSize: 14, fontWeight: "900" }} selectable>
          {item.name}
        </Text>
        <Text style={{ color: colors.mutedDark, fontSize: 12, fontWeight: "800", marginTop: 2 }} selectable>
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
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 14,
        gap: 12,
        opacity: pressed ? 0.88 : 1,
        boxShadow: "0 12px 24px rgba(0,0,0,0.20)",
        transform: [{ scale: pressed ? 0.99 : 1 }]
      })}
    >
      <Image source={{ uri: normalizeRemoteImageUrl(imageUrl) }} style={{ width: "100%", height: 154, borderRadius: 10, backgroundColor: colors.secondary }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textDark, fontSize: 20, fontWeight: "900", lineHeight: 25 }} selectable>
            {recommendation.name}
          </Text>
          <Text style={{ color: colors.mutedDark, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: 5 }} selectable>
            {recommendation.description}
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
          Kiểm tra nguyên liệu thiếu
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
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
          {items.map((item) => (
            <View key={item} style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: `${color}24` }}>
              <Text style={{ color: colors.textDark, fontSize: 12, fontWeight: "800" }} selectable>
                {item}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
