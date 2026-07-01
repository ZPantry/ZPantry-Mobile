import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text } from "react-native";
import { colors } from "@/constants/colors";

type Props = {
  label: string;
  active?: boolean;
  icon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress?: () => void;
};

export default function CategoryChip({ label, active = false, icon, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 40,
        borderRadius: 999,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: active ? colors.primary : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.secondary : colors.line,
        opacity: pressed ? 0.82 : 1,
        boxShadow: active ? "0 8px 20px rgba(244, 162, 28, 0.26)" : "0 8px 18px rgba(0,0,0,0.14)"
      })}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={17} color={active ? colors.white : colors.primary} /> : null}
      <Text style={{ color: active ? colors.white : colors.text, fontWeight: "800", fontSize: 13 }} selectable>
        {label}
      </Text>
    </Pressable>
  );
}
