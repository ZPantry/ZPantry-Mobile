import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import type { PantryItem } from "@/types";
import { statusColor } from "@/utils/helpers";

type Props = {
  item: PantryItem;
  onPress?: () => void;
};

export default function PantryItemCard({ item, onPress }: Props) {
  const color = statusColor(item.status);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.card,
        borderRadius: 14,
        borderCurve: "continuous",
        padding: 16,
        flexDirection: "row",
        gap: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.line,
        boxShadow: "0 10px 22px rgba(0,0,0,0.20)",
        opacity: pressed ? 0.84 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }]
      })}
    >
      <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons name={item.icon as never} size={27} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: 15 }} selectable>
              {item.name}
            </Text>
            <Text style={{ color: colors.primary, marginTop: 2, fontWeight: "800", fontSize: 13 }} selectable>
              {item.quantity}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialCommunityIcons name={item.status === "safe" ? "check-circle" : "alert"} size={22} color={color} />
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
          </View>
        </View>
        <Text style={{ color: item.status === "danger" ? colors.danger : colors.primary, fontWeight: "800", fontSize: 12 }} selectable>
          {item.expiryLabel}
        </Text>
        <View style={{ height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.30)", overflow: "hidden" }}>
          <View style={{ width: `${item.progress}%`, height: "100%", backgroundColor: color }} />
        </View>
      </View>
    </Pressable>
  );
}
