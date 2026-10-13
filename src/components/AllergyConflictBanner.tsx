import Text from "@/components/AppText";
import { colors } from "@/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View } from "react-native";

export function isAllergyConflictMessage(message: string) {
  const normalized = message.toLocaleLowerCase("vi-VN");
  return normalized.includes("chất gây dị ứng") || normalized.includes("dị ứng đã khai báo");
}

export default function AllergyConflictBanner({ message }: { message: string }) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ backgroundColor: "#FFF0EE", borderColor: colors.danger, borderWidth: 2, borderRadius: 16, padding: 16, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <MaterialCommunityIcons name="alert-octagon" size={28} color={colors.danger} />
        <Text style={{ flex: 1, color: colors.danger, fontSize: 18, fontWeight: "800" }}>Không thể thêm thực phẩm này</Text>
      </View>
      <Text style={{ color: colors.text, fontWeight: "700", lineHeight: 22 }}>Thực phẩm có thành phần gây dị ứng theo hồ sơ của bạn.</Text>
      <Text selectable style={{ color: colors.text, lineHeight: 21 }}>{message}</Text>
    </View>
  );
}
