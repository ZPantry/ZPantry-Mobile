import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text, ViewStyle } from "react-native";
import { colors } from "@/constants/colors";

type Props = {
  title: string;
  icon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
  variant?: "solid" | "soft" | "outline";
  onPress?: () => void;
  style?: ViewStyle;
};

export default function PrimaryButton({ title, icon, variant = "solid", onPress, style }: Props) {
  const isSolid = variant === "solid";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 50,
          borderRadius: 18,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 18,
          backgroundColor: isSolid ? colors.primary : variant === "soft" ? colors.secondary : "transparent",
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: colors.primary,
          opacity: pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        },
        style
      ]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={20} color={isSolid ? colors.white : colors.dark} /> : null}
      <Text style={{ color: isSolid ? colors.white : colors.dark, fontWeight: "800", fontSize: 15 }} selectable>
        {title}
      </Text>
    </Pressable>
  );
}
