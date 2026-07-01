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
      <Image source={{ uri: meal.image }} style={{ width: "100%", height: compact ? 104 : 176, backgroundColor: colors.secondary }} />
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
