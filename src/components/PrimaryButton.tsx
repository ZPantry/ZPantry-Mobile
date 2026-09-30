import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useState } from "react";
import { Pressable, Text, ViewStyle } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";
import { colors } from "@/constants/colors";

type Props = {
  title: string;
  icon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
  variant?: "solid" | "soft" | "outline";
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
};

export default function PrimaryButton({ title, icon, variant = "solid", onPress, style, disabled = false }: Props) {
  const isSolid = variant === "solid";
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={{ flex: style?.flex }}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={8}
      pressRetentionOffset={16}
    >
      <Animated.View
        style={[
          {
          minHeight: 44,
          borderRadius: 12,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 14,
          backgroundColor: isSolid ? colors.primary : variant === "soft" ? colors.card : "transparent",
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: colors.line,
            opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            transitionProperty: ["transform", "opacity"],
            transitionDuration: "120ms",
            transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1)
          },
          style
        ]}
      >
        {icon ? <MaterialCommunityIcons name={icon} size={18} color={isSolid ? colors.white : colors.text} /> : null}
        <Text style={{ color: isSolid ? colors.white : colors.text, fontWeight: "800", fontSize: 14 }} selectable>
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
