import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { colors } from "@/constants/colors";
import type { PantryItem } from "@/types";
import { statusColor } from "@/utils/helpers";

type Props = {
  item: PantryItem;
};

export default function PantryItemCard({ item }: Props) {
  const color = statusColor(item.status);
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 24,
        borderCurve: "continuous",
        padding: 16,
        flexDirection: "row",
        gap: 14,
        alignItems: "center",
        boxShadow: "0 8px 20px rgba(29, 36, 40, 0.08)"
      }}
    >
      <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons name={item.icon as never} size={27} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.dark, fontWeight: "900", fontSize: 16 }} selectable>
              {item.name}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 2, fontWeight: "600" }} selectable>
              {item.quantity}
            </Text>
          </View>
          <View style={{ borderRadius: 999, backgroundColor: `${color}18`, paddingHorizontal: 10, height: 28, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color, fontWeight: "900", fontSize: 12 }} selectable>
              {item.status === "danger" ? "Gấp" : item.status === "warning" ? "Sớm" : "Ổn"}
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }} selectable>
          {item.expiryLabel}
        </Text>
        <View style={{ height: 8, borderRadius: 999, backgroundColor: "#F0D8AF", overflow: "hidden" }}>
          <View style={{ width: `${item.progress}%`, height: "100%", backgroundColor: color }} />
        </View>
      </View>
    </View>
  );
}
