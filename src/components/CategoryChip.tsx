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
        minHeight: 42,
        borderRadius: 999,
        paddingHorizontal: 15,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: active ? colors.dark : colors.card,
        opacity: pressed ? 0.8 : 1
      })}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={17} color={active ? colors.white : colors.primary} /> : null}
      <Text style={{ color: active ? colors.white : colors.text, fontWeight: "800", fontSize: 14 }} selectable>
        {label}
      </Text>
    </Pressable>
  );
}
