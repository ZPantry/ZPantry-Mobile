import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { colors } from "@/constants/colors";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function AppHeader({ title = "Z-Pantry", subtitle }: Props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <View>
        <Text style={{ color: colors.dark, fontSize: 30, fontWeight: "900", letterSpacing: 0 }} selectable>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: colors.muted, fontSize: 15, marginTop: 4 }} selectable>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 18,
          borderCurve: "continuous",
          backgroundColor: colors.card,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 20px rgba(29, 36, 40, 0.12)"
        }}
      >
        <MaterialCommunityIcons name="chef-hat" size={26} color={colors.primary} />
      </View>
    </View>
  );
}
