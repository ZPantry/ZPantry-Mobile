import { Image, Text, View } from "react-native";
import { colors } from "@/constants/colors";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function AppHeader({ title = "Z-Pantry", subtitle }: Props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <View>
        {title === "Z-Pantry" ? (
          <Image source={require("../../assets/images/z-pantry-logo.png")} resizeMode="contain" style={{ width: 156, height: 50 }} />
        ) : (
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: "900", letterSpacing: 0 }} selectable>
            {title}
          </Text>
        )}
        {subtitle ? (
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "800", marginTop: 4 }} selectable>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Image source={require("../../assets/images/z-pantry-logo.png")} resizeMode="contain" style={{ width: 72, height: 44 }} />
    </View>
  );
}
