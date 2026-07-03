import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, ViewStyle } from "react-native";
import { colors } from "@/constants/colors";

type Props = {
  label?: string;
  onPress: () => void;
  variant?: "header" | "floating" | "icon";
  style?: ViewStyle;
};

export default function AppBackButton({ label = "Quay lại", onPress, variant = "header", style }: Props) {
  const isFloating = variant === "floating";
  const isIconOnly = variant === "icon" || isFloating;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          minWidth: isIconOnly ? 46 : undefined,
          width: isIconOnly ? 46 : undefined,
          height: 46,
          borderRadius: 17,
          backgroundColor: isFloating ? "rgba(0,59,30,0.72)" : colors.card,
          borderWidth: 1,
          borderColor: colors.line,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 7,
          paddingHorizontal: isIconOnly ? 0 : 12,
          opacity: pressed ? 0.78 : 1,
          boxShadow: "0 8px 18px rgba(0,0,0,0.18)"
        },
        style
      ]}
    >
      <Ionicons name="chevron-back" size={24} color={colors.primary} />
      {isIconOnly ? null : (
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: "900" }} selectable={false}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
