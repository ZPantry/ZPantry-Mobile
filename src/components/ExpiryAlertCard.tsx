import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { colors } from "@/constants/colors";

type Props = {
  title: string;
  tone?: "warning" | "danger" | "success";
};

export default function ExpiryAlertCard({ title, tone = "warning" }: Props) {
  const toneColor = tone === "danger" ? colors.danger : tone === "success" ? colors.success : colors.warning;
  return (
    <View
      style={{
        backgroundColor: tone === "warning" ? "rgba(244,162,28,0.72)" : colors.card,
        borderRadius: 16,
        borderCurve: "continuous",
        padding: 16,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: tone === "warning" ? "rgba(255,255,255,0.22)" : colors.line,
        boxShadow: "0 10px 22px rgba(0,0,0,0.18)"
      }}
    >
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.26)", alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={23} color={toneColor === colors.warning ? colors.white : toneColor} />
      </View>
      <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "800", lineHeight: 20 }} selectable>
        {title}
      </Text>
    </View>
  );
}
