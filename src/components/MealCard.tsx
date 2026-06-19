import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import type { Meal } from "@/types";

type Props = {
  meal: Meal;
  compact?: boolean;
  onPress?: () => void;
};

export default function MealCard({ meal, compact = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: compact ? 190 : "100%",
        backgroundColor: colors.card,
        borderRadius: 26,
        borderCurve: "continuous",
        overflow: "hidden",
        boxShadow: "0 10px 24px rgba(29, 36, 40, 0.10)",
        opacity: pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }]
      })}
    >
      <Image source={{ uri: meal.image }} style={{ width: "100%", height: compact ? 116 : 178, backgroundColor: colors.secondary }} />
      <View style={{ padding: 15, gap: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <Text style={{ flex: 1, color: colors.dark, fontWeight: "900", fontSize: compact ? 16 : 19, lineHeight: compact ? 21 : 24 }} selectable>
            {meal.name}
          </Text>
          <View style={{ borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: colors.secondary }}>
            <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 12 }} selectable>
              {meal.matchPercent}%
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
            <Ionicons name="time" size={16} color={colors.muted} />
            <Text style={{ color: colors.muted, fontWeight: "700" }} selectable>
              {meal.time}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
            <MaterialCommunityIcons name="fire" size={16} color={colors.warning} />
            <Text style={{ color: colors.muted, fontWeight: "700" }} selectable>
              {meal.calories} kcal
            </Text>
          </View>
        </View>
        {!compact ? (
          <View style={{ minHeight: 42, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.white, fontWeight: "900" }} selectable>
              Xem công thức
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
