import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import type { PantryItem } from "@/types";
import { statusColor } from "@/utils/helpers";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";

type Props = {
  item: PantryItem;
  onPress?: () => void;
};

function statusCopy(status: PantryItem["status"]) {
  if (status === "danger") return "Cần dùng ngay";
  if (status === "warning") return "Sắp hết hạn";
  return "Còn tốt";
}

export default function PantryItemCard({ item, onPress }: Props) {
  const color = statusColor(item.status);
  const imageUrl = normalizeRemoteImageUrl(item.imageUrl || FALLBACK_FOOD_IMAGE_URL);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.white,
        borderRadius: 16,
        borderCurve: "continuous",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: item.status === "safe" ? "rgba(255,255,255,0.42)" : `${color}66`,
        boxShadow: "0 16px 30px rgba(0,0,0,0.24)",
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }]
      })}
    >
      <View style={{ height: 132, backgroundColor: colors.secondary }}>
        <Image source={{ uri: imageUrl }} style={{ width: "100%", height: "100%" }} />
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 58, backgroundColor: "rgba(0,0,0,0.28)" }} />

        <View style={{ position: "absolute", left: 12, top: 12, borderRadius: 999, backgroundColor: `${color}E6`, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 5 }}>
          <MaterialCommunityIcons name={item.status === "safe" ? "check-circle" : "alert-circle"} size={15} color={colors.white} />
          <Text style={{ color: colors.white, fontSize: 11, fontWeight: "900" }} selectable>
            {statusCopy(item.status)}
          </Text>
        </View>

        <View style={{ position: "absolute", right: 12, top: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" }}>
          <MaterialCommunityIcons name={item.icon as never} size={20} color={colors.primaryDark} />
        </View>
      </View>

      <View style={{ padding: 14, gap: 11 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={2} style={{ color: colors.textDark, fontWeight: "900", fontSize: 18, lineHeight: 23 }} selectable>
              {item.name}
            </Text>
            <Text style={{ color: colors.primaryDark, marginTop: 3, fontWeight: "900", fontSize: 13 }} selectable>
              {item.quantity}
            </Text>
          </View>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primaryDark} />
          </View>
        </View>

        <View style={{ borderRadius: 12, backgroundColor: "#F3F7F1", padding: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MaterialCommunityIcons name="calendar-clock" size={18} color={color} />
          <Text style={{ flex: 1, color: item.status === "danger" ? colors.danger : colors.mutedDark, fontWeight: "800", fontSize: 12, lineHeight: 17 }} selectable>
            {item.expiryLabel}
          </Text>
        </View>

        <View style={{ height: 8, borderRadius: 999, backgroundColor: "#E6EEE4", overflow: "hidden" }}>
          <View style={{ width: `${item.progress}%`, height: "100%", borderRadius: 999, backgroundColor: color }} />
        </View>
      </View>
    </Pressable>
  );
}
