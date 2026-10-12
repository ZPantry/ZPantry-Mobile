import Text from "@/components/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, shadows } from "@/constants/colors";
import { layoutTokens } from "@/constants/responsive";

type Props = {
  title: string;
  icon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
  variant?: "solid" | "soft" | "outline";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
};

export default function PrimaryButton({
  title,
  icon,
  variant = "solid",
  onPress,
  style,
  disabled = false,
  loading = false
}: Props) {
  const solid = variant === "solid";
  const color = solid ? colors.white : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          borderRadius: radius.sm,
          borderCurve: "continuous",
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          gap: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: solid
            ? colors.primary
            : variant === "soft"
            ? colors.surface2
            : colors.surface,
          borderWidth: solid ? 0 : 1,
          borderColor: colors.line,
          boxShadow: solid ? shadows.button : undefined,
          opacity: disabled || loading ? 0.5 : pressed ? 0.76 : 1
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : icon ? (
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      ) : null}
      <Text
        maxFontSizeMultiplier={layoutTokens.maxFontScaleCaps.button}
        style={{
          color,
          fontWeight: "700",
          fontSize: 14,
          flexShrink: 1,
          textAlign: "center"
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
