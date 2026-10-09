import Text from "@/components/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable } from "react-native";
import { colors } from "@/constants/colors";
import { layoutTokens } from "@/constants/responsive";

type Props = {
  label: string;
  active?: boolean;
  icon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress?: () => void;
};

export default function CategoryChip({ label, active = false, icon, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={layoutTokens.hitSlop48From40}
      style={({ pressed }) => ({
        minHeight: 40,
        borderRadius: 999,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: active ? colors.secondary : colors.card,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.line,
        opacity: pressed ? 0.82 : 1,
        boxShadow: "0 2px 6px rgba(0,48,20,0.04)"
      })}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={17} color={active ? colors.primaryDark : colors.primary} /> : null}
      <Text
        maxFontSizeMultiplier={layoutTokens.maxFontScaleCaps.badge}
        style={{ color: active ? colors.primaryDark : colors.text, fontWeight: "600", fontSize: 13 }}
        selectable
      >
        {label}
      </Text>
    </Pressable>
  );
}
