import Text from "@/components/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View } from "react-native";
import { colors, radius } from "@/constants/colors";
export default function ExpiryAlertCard({ title, tone = "warning" }: { title: string; tone?: "warning" | "danger" | "success" }) {
  const color = tone === "danger" ? colors.danger : tone === "success" ? colors.success : colors.warning;
  const backgroundColor = tone === "danger" ? colors.dangerSoft : tone === "success" ? colors.successSoft : colors.warningSoft;
  return <View accessibilityRole={tone === "danger" ? "alert" : undefined} style={{ backgroundColor, borderRadius: radius.sm, padding: 14, flexDirection: "row", gap: 10, alignItems: "center" }}>
    <MaterialCommunityIcons name={tone === "success" ? "check-circle-outline" : "alert-circle-outline"} size={22} color={color} />
    <Text selectable style={{ flex: 1, color, fontSize: 13, fontWeight: "600", lineHeight: 20 }}>{title}</Text>
  </View>;
}
