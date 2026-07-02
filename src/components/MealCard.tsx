import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import type { Meal } from "@/types";
import { getGradientPair } from "@/utils/gradients";

type Props = {
  meal: Meal;
  compact?: boolean;
  onPress?: () => void;
};

export default function MealCard({ meal, compact = false, onPress }: Props) {
  const palette = getGradientPair(meal);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: compact ? 168 : "100%",
        backgroundColor: colors.white,
        borderRadius: 12,
        borderCurve: "continuous",
        overflow: "hidden",
        boxShadow: "0 12px 24px rgba(0,0,0,0.22)",
        opacity: pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }]
      })}
    >
      <View style={{ width: "100%", height: compact ? 104 : 176, backgroundColor: palette.start, position: "relative", overflow: "hidden" }}>
        {meal.image ? <Image source={{ uri: meal.image }} style={{ width: "100%", height: "100%", opacity: 0.78 }} /> : null}
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: palette.start,
            opacity: meal.image ? 0.28 : 1
          }}
        />
        <View style={{ position: "absolute", right: -28, top: -18, width: 120, height: 120, borderRadius: 60, backgroundColor: palette.end, opacity: 0.36 }} />
        <View style={{ position: "absolute", left: -24, bottom: -24, width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(255,255,255,0.18)" }} />
      </View>
      <View style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <Text style={{ flex: 1, color: colors.textDark, fontWeight: "900", fontSize: compact ? 15 : 20, lineHeight: compact ? 20 : 25 }} selectable>
            {meal.name}
          </Text>
          <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: colors.secondary }}>
            <Text style={{ color: colors.primaryDark, fontWeight: "900", fontSize: 11 }} selectable>
              {meal.matchPercent}%
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
            <Ionicons name="time" size={15} color={colors.primary} />
            <Text style={{ color: colors.primaryDark, fontWeight: "800", fontSize: 12 }} selectable>
              {meal.time}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
            <MaterialCommunityIcons name="fire" size={15} color={colors.warning} />
            <Text style={{ color: colors.primaryDark, fontWeight: "800", fontSize: 12 }} selectable>
              {meal.calories} kcal
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
