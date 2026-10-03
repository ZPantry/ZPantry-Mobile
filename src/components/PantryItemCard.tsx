import Text from "@/components/AppText";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, View } from "react-native";
import { colors } from "@/constants/colors";
import type { PantryItem } from "@/types";
import { statusColor } from "@/utils/helpers";
import { FALLBACK_FOOD_IMAGE_URL, normalizeRemoteImageUrl } from "@/utils/image";
import FigmaAsset from './FigmaAsset';
import { pantryAssets, profileAssets } from '@/constants/figmaAssets';

type Props = {
  item: PantryItem;
  onPress?: () => void;
  quantityControl?: { value: number; unit: string; busy: boolean; onChange: (value: number) => void };
};

function statusCopy(status: PantryItem["status"]) {
  if (status === "danger") return "Cần dùng ngay";
  if (status === "warning") return "Sắp hết hạn";
  return "Còn tốt";
}

function locationCopy(location: PantryItem["location"]) {
  if (location === "Ngan dong") return "Ngăn đông";
  if (location === "Ke bep") return "Kệ bếp";
  return "Tủ lạnh";
}

function statusIcon(status: PantryItem["status"]): keyof typeof Ionicons.glyphMap {
  if (status === "safe") return "checkmark-circle";
  if (status === "danger") return "alert-circle";
  return "time";
}

export default function PantryItemCard({ item, onPress, quantityControl }: Props) {
  const color = statusColor(item.status);
  const imageUrl = normalizeRemoteImageUrl(item.imageUrl || FALLBACK_FOOD_IMAGE_URL);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.white,
        borderRadius: 12,
        borderCurve: "continuous",
        padding: 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderWidth: 1,
        borderColor: item.status === "safe" ? "transparent" : `${color}4D`,
        opacity: pressed ? 0.86 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }]
      })}
    >
      <Image source={{ uri: imageUrl }} style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: colors.secondary }} />

      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: colors.textDark, fontSize: 15, lineHeight: 20, fontWeight: "600" }} selectable>
            {item.name}
          </Text>
          <View style={{ borderRadius: 999, backgroundColor: `${color}18`, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color, fontSize: 10, fontWeight: "700" }} selectable>
              {statusCopy(item.status)}
            </Text>
          </View>
        </View>

        <Text numberOfLines={1} style={{ color: colors.mutedDark, fontSize: 12, lineHeight: 17, fontWeight: "600" }} selectable>
          {quantityControl ? locationCopy(item.location) : `${item.quantity} · ${locationCopy(item.location)}`}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name={statusIcon(item.status)} size={14} color={color} />
          <Text numberOfLines={1} style={{ flex: 1, color: item.status === "danger" ? colors.danger : colors.mutedDark, fontSize: 12, lineHeight: 17, fontWeight: "600" }} selectable>
            {item.expiryLabel}
          </Text>
        </View>

        <View style={{ height: 6, borderRadius: 999, backgroundColor: "#E6EEE4", overflow: "hidden", marginTop: 2, maxWidth: 128 }}>
          <View style={{ width: `${item.progress}%`, height: "100%", borderRadius: 999, backgroundColor: color }} />
        </View>
      </View>

      {quantityControl ? <View style={{ alignItems: 'center', gap: 6 }}>
        <Text style={{ color: colors.text, fontSize: 11, fontWeight: '600' }}>{quantityControl.value} {quantityControl.unit}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[-1, 1].map(delta => <Pressable key={delta} accessibilityRole="button" accessibilityLabel={`${delta < 0 ? 'Giảm' : 'Tăng'} số lượng ${item.name}`} disabled={quantityControl.busy || (delta < 0 && quantityControl.value <= 1)} accessibilityState={{ disabled: quantityControl.busy || (delta < 0 && quantityControl.value <= 1), busy: quantityControl.busy }}
            onPress={event => { event.stopPropagation(); quantityControl.onChange(quantityControl.value + delta); }}
            style={{ width: 32, height: 32, borderRadius: 8, borderWidth: delta < 0 ? 1 : 0, borderColor: colors.line, backgroundColor: delta < 0 ? colors.white : colors.primary, alignItems: 'center', justifyContent: 'center', opacity: quantityControl.busy || (delta < 0 && quantityControl.value <= 1) ? 0.4 : 1 }}>
            <FigmaAsset asset={delta < 0 ? pantryAssets.imgContainer4 : pantryAssets.imgContainer5} />
          </Pressable>)}
        </View>
      </View> : <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
        <FigmaAsset asset={profileAssets.imgContainer9} />
      </View>}
    </Pressable>
  );
}
