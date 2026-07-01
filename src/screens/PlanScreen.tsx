import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Image, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Recipe } from "@/api/recipes";
import { recipesApi } from "@/api/recipes";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default function PlanScreen() {
  const { user } = useAuth();
  const displayName = user?.fullName || "bạn";
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadRecipes = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const page = await recipesApi.list(1, 21);
      setRecipes(page.data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Chưa tải được thực đơn.");
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadRecipes} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 22, paddingBottom: 118, gap: 18 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }} selectable>
              Quay lại
            </Text>
          </View>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="notifications-outline" size={21} color={colors.text} />
            <View style={{ position: "absolute", top: 3, right: 4, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger }} />
          </View>
        </View>

        <View>
          <Text style={{ color: colors.text, fontSize: 27, fontWeight: "900" }} selectable>
            Thực đơn của {displayName}
          </Text>
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: "900", marginTop: 3 }} selectable>
            Chọn món để xếp bữa trong tuần
          </Text>
        </View>

        {errorMessage ? (
          <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16 }}>
            <Text style={{ color: "#FFE6E6", fontWeight: "800", textAlign: "center" }} selectable>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <Text style={{ color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
          Tuần này
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {dayLabels.map((day, index) => {
            const todayIndex = (new Date().getDay() + 6) % 7;
            const active = index === todayIndex;
            return (
              <View
                key={day}
                style={{
                  width: 58,
                  height: 72,
                  borderRadius: 12,
                  backgroundColor: active ? "rgba(244,162,28,0.45)" : colors.card,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.line,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3
                }}
              >
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: "800" }} selectable>
                  {day}
                </Text>
                <Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }} selectable>
                  {index + 1}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatCard value={`${recipes.length}`} label="Món có thể chọn" />
          <StatCard value={`${Math.min(recipes.length, 7)}`} label="Gợi ý cho tuần" alignRight />
        </View>

        <View style={{ gap: 14 }}>
          {recipes.length === 0 ? (
            <View style={{ backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }} selectable>
                Chưa có món để lên kế hoạch
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700", lineHeight: 20 }} selectable>
                Kéo xuống để tải lại khi có công thức mới.
              </Text>
            </View>
          ) : (
            recipes.slice(0, 7).map((recipe, index) => (
              <View key={recipe.id} style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
                    <MaterialCommunityIcons name={index % 3 === 0 ? "weather-sunny" : index % 3 === 1 ? "silverware-fork-knife" : "weather-night"} size={22} color={colors.white} />
                  </View>
                  <Text style={{ flex: 1, color: colors.text, fontSize: 20, fontWeight: "900" }} selectable>
                    {index % 3 === 0 ? "Bữa sáng" : index % 3 === 1 ? "Bữa trưa" : "Bữa tối"}
                  </Text>
                  <View style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,0.24)", paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "900" }} selectable>
                      {recipe.cookingTimeMinutes} phút
                    </Text>
                  </View>
                </View>
                {recipe.imageUrl ? <Image source={{ uri: recipe.imageUrl }} style={{ width: "100%", height: 150, backgroundColor: colors.surface }} /> : null}
                <View style={{ padding: 12, gap: 8 }}>
                  <Text style={{ color: colors.text, fontSize: index === 0 ? 20 : 17, fontWeight: "900" }} selectable>
                    {recipe.name}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 16 }}>
                    <Meta icon="people-outline" text={`${recipe.servingSize || 1} phần`} />
                    <Meta icon="restaurant-outline" text={recipe.difficulty || "Dễ nấu"} />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ value, label, alignRight = false }: { value: string; label: string; alignRight?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 8, alignItems: alignRight ? "flex-end" : "flex-start" }}>
      <Text style={{ color: colors.primary, fontSize: 24, fontWeight: "900", fontVariant: ["tabular-nums"] }} selectable>
        {value}
      </Text>
      <View style={{ width: "100%", height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.32)", overflow: "hidden" }}>
        <View style={{ width: "65%", height: "100%", backgroundColor: colors.primary }} />
      </View>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800", textAlign: alignRight ? "right" : "left" }} selectable>
        {label}
      </Text>
    </View>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Ionicons name={icon} size={13} color={colors.primary} />
      <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800" }} selectable>
        {text}
      </Text>
    </View>
  );
}
