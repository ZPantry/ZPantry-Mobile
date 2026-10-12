import Text from "@/components/AppText";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ViewStyle } from "react-native";
import { colors } from "@/constants/colors";
import { layoutTokens } from "@/constants/responsive";

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
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={layoutTokens.hitSlop48From44}
      style={({ pressed }) => [
        {
          minWidth: isIconOnly ? 48 : 48,
          width: isIconOnly ? 48 : undefined,
          minHeight: 48,
          borderRadius: 12,
          backgroundColor: isFloating ? "rgba(0,59,30,0.72)" : colors.card,
          borderWidth: 1,
          borderColor: colors.line,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 6,
          paddingHorizontal: isIconOnly ? 0 : 12,
          opacity: pressed ? 0.78 : 1,
          boxShadow: "0 2px 6px rgba(0,48,20,0.04)"
        },
        style
      ]}
    >
      <Ionicons name="chevron-back" size={24} color={colors.primary} />
      {isIconOnly ? null : (
        <Text
          maxFontSizeMultiplier={layoutTokens.maxFontScaleCaps.button}
          style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}
          selectable={false}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
