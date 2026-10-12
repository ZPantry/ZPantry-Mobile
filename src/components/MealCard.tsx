import Text from "@/components/AppText";
import { Pressable, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { colors } from "@/constants/colors";
import type { Meal } from "@/types";
import { normalizeRemoteImageUrl } from "@/utils/image";
import FigmaAsset from './FigmaAsset';
import { homeAssets, exploreAssets } from '@/constants/figmaAssets';
import { layoutTokens } from "@/constants/responsive";

type Props = {
  meal: Meal;
  compact?: boolean;
  onPress?: () => void;
};

export default function MealCard({ meal, compact = false, onPress }: Props) {
  const imageUrl = normalizeRemoteImageUrl(meal.image);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Món ${meal.name}`}
      onPress={onPress}
      style={({ pressed }) => ({
        width: compact ? 270 : "100%",
        backgroundColor: colors.white,
        borderRadius: 14,
        borderCurve: "continuous",
        overflow: "hidden",
        boxShadow: "0 2px 6px rgba(0,48,20,0.04)",
        opacity: pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }]
      })}
    >
      <View style={{ width: "100%", aspectRatio: compact ? 16 / 9 : 16 / 10, minHeight: compact ? 144 : 180, backgroundColor: colors.secondary }}>
        <ExpoImage
          source={{ uri: imageUrl }}
          contentFit="cover"
          transition={200}
          style={{ width: "100%", height: "100%" }}
        />
        <View style={{ position: 'absolute', bottom: 8, right: 8, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.92)' }}>
          <Text maxFontSizeMultiplier={layoutTokens.maxFontScaleCaps.badge} style={{ color: colors.text, fontSize: 11, fontWeight: '600' }}>
            {meal.time}
          </Text>
        </View>
      </View>
      <View style={{ padding: 10, gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <Text
            numberOfLines={compact ? 2 : undefined}
            style={{ flex: 1, color: colors.textDark, fontWeight: "700", fontSize: compact ? 14 : 18, lineHeight: compact ? 20 : 24 }}
            selectable
          >
            {meal.name}
          </Text>
          <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.secondary }}>
            <Text maxFontSizeMultiplier={layoutTokens.maxFontScaleCaps.badge} style={{ color: colors.primaryDark, fontWeight: "700", fontSize: 11 }} selectable>
              {meal.matchPercent == null ? meal.difficulty : `${meal.matchPercent}%`}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
            <FigmaAsset asset={exploreAssets.imgContainer16} />
            <Text maxFontSizeMultiplier={layoutTokens.maxFontScaleCaps.badge} style={{ color: colors.primaryDark, fontWeight: "600", fontSize: 12 }} selectable>
              {meal.time}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
            <FigmaAsset asset={homeAssets.imgContainer5} />
            <Text maxFontSizeMultiplier={layoutTokens.maxFontScaleCaps.badge} style={{ color: colors.primaryDark, fontWeight: "600", fontSize: 12 }} selectable>
              {meal.calories == null ? "Chưa có kcal" : `${meal.calories} kcal`}
            </Text>
          </View>
        </View>
        <View style={{ minHeight: 34, borderRadius: 8, backgroundColor: '#F1F1F1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 }}>
          <Text maxFontSizeMultiplier={layoutTokens.maxFontScaleCaps.badge} style={{ color: '#0D2818', fontSize: 13, fontWeight: '600' }}>Xem công thức</Text>
          <FigmaAsset asset={homeAssets.imgContainer6} />
        </View>
      </View>
    </Pressable>
  );
}
