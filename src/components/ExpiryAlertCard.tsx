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
        backgroundColor: colors.card,
        borderRadius: 22,
        borderCurve: "continuous",
        padding: 16,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        borderLeftWidth: 5,
        borderLeftColor: toneColor
      }}
    >
      <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }}>
        <MaterialCommunityIcons name="alert-circle" size={23} color={toneColor} />
      </View>
      <Text style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: "800", lineHeight: 21 }} selectable>
        {title}
      </Text>
    </View>
  );
}
