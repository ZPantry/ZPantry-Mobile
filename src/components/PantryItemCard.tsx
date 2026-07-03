import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

function locationCopy(location: PantryItem["location"]) {
  if (location === "Ngan dong") return "Ngăn đông";
  return "Tủ lạnh";
}

function statusIcon(status: PantryItem["status"]): keyof typeof Ionicons.glyphMap {
  if (status === "safe") return "checkmark-circle";
  if (status === "danger") return "alert-circle";
  return "time";
}

export default function PantryItemCard({ item, onPress }: Props) {
  const color = statusColor(item.status);
  const imageUrl = normalizeRemoteImageUrl(item.imageUrl || FALLBACK_FOOD_IMAGE_URL);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.white,
        borderRadius: 12,
        borderCurve: "continuous",
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: item.status === "safe" ? "transparent" : `${color}4D`,
        opacity: pressed ? 0.86 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }]
      })}
    >
      <Image source={{ uri: imageUrl }} style={{ width: 58, height: 58, borderRadius: 14, backgroundColor: colors.secondary }} />

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: colors.textDark, fontSize: 16, lineHeight: 21, fontWeight: "900" }} selectable>
            {item.name}
          </Text>
          <View style={{ borderRadius: 999, backgroundColor: `${color}18`, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color, fontSize: 10, fontWeight: "900" }} selectable>
              {statusCopy(item.status)}
            </Text>
          </View>
        </View>

        <Text numberOfLines={1} style={{ color: colors.mutedDark, fontSize: 12, lineHeight: 17, fontWeight: "800" }} selectable>
          {item.quantity} · {locationCopy(item.location)}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name={statusIcon(item.status)} size={14} color={color} />
          <Text numberOfLines={1} style={{ flex: 1, color: item.status === "danger" ? colors.danger : colors.mutedDark, fontSize: 12, lineHeight: 17, fontWeight: "800" }} selectable>
            {item.expiryLabel}
          </Text>
        </View>

        <View style={{ height: 4, borderRadius: 999, backgroundColor: "#E6EEE4", overflow: "hidden", marginTop: 2 }}>
          <View style={{ width: `${item.progress}%`, height: "100%", borderRadius: 999, backgroundColor: color }} />
        </View>
      </View>

      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons name="chevron-right" size={23} color={colors.primaryDark} />
      </View>
    </Pressable>
  );
}
