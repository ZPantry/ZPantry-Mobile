import Text from "@/components/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, View } from "react-native";
import { colors, radius, spacing } from "@/constants/colors";
import FigmaAsset, { type DesignAsset } from './FigmaAsset';
import { profileAssets } from '@/constants/figmaAssets';

type Icon = ComponentProps<typeof MaterialCommunityIcons>["name"];
export function SectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
    <Text style={{ flex: 1, color: colors.text, fontSize: 20, lineHeight: 27, fontWeight: "700" }}>{title}</Text>
    {action ? <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ minHeight: 44, justifyContent: "center" }}>
      <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "600" }}>{action}  →</Text>
    </Pressable> : null}
  </View>;
}

export function BrandPanel({ eyebrow, title, description, children, asset }: {
  eyebrow: string; title: string; description: string; children?: ReactNode; asset?: DesignAsset;
}) {
  return <View style={{ backgroundColor: colors.dark, padding: spacing.page, borderRadius: radius.md,
    borderCurve: "continuous", gap: spacing.md, overflow: "hidden" }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      {asset ? <FigmaAsset asset={asset} /> : <MaterialCommunityIcons name="chef-hat" size={18} color={colors.secondary} />}
      <Text style={{ color: colors.onDarkMuted, fontSize: 11, fontWeight: "600", letterSpacing: 0.6 }}>{eyebrow}</Text>
    </View>
    <Text style={{ color: colors.onDark, fontSize: 20, lineHeight: 27, fontWeight: "700" }}>{title}</Text>
    <Text style={{ color: colors.onDarkMuted, fontSize: 12, lineHeight: 19 }}>{description}</Text>
    {children}
  </View>;
}

export function ActionRow({ icon, title, subtitle, upcoming, onPress, asset }: { icon: Icon; title: string; subtitle?: string; upcoming?: boolean; onPress: () => void; asset?: DesignAsset }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={upcoming ? "Chức năng chưa khả dụng" : undefined} onPress={onPress} style={({ pressed }) => ({
    backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.lg, flexDirection: "row",
    alignItems: "center", gap: spacing.md, opacity: pressed ? 0.7 : 1,
  })}>
    <View style={{ width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" }}>
      {asset ? <FigmaAsset asset={asset} /> : <MaterialCommunityIcons name={icon} size={20} color={colors.dark} />}
    </View>
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>{title}{upcoming ? <Text style={{ color: colors.muted, fontSize: 11 }}>  · Sắp có</Text> : null}</Text>
      {subtitle ? <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{subtitle}</Text> : null}
    </View>
    <FigmaAsset asset={profileAssets.imgContainer9} />
  </Pressable>;
}
