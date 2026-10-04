import Text from "@/components/AppText";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, Pressable, View } from "react-native";
import { colors } from "@/constants/colors";
import type { Meal } from "@/types";
import { normalizeRemoteImageUrl } from "@/utils/image";
import FigmaAsset from './FigmaAsset';
import { homeAssets, exploreAssets } from '@/constants/figmaAssets';

type Props = {
  meal: Meal;
  compact?: boolean;
  onPress?: () => void;
};

export default function MealCard({ meal, compact = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: compact ? 270 : "100%",
        backgroundColor: colors.white,
        borderRadius: 12,
        borderCurve: "continuous",
        overflow: "hidden",
        boxShadow: "0 2px 6px rgba(0,48,20,0.04)",
        opacity: pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }]
      })}
    >
      <View>
        <Image source={{ uri: normalizeRemoteImageUrl(meal.image) }} style={{ width: "100%", height: compact ? 144 : 200, backgroundColor: colors.secondary }} />
        <View style={{ position: 'absolute', bottom: 8, right: 8, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.white }}><Text style={{ color: colors.text, fontSize: 11 }}>{meal.time}</Text></View>
      </View>
      <View style={{ padding: 8, gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
          <Text numberOfLines={compact ? 2 : undefined} style={{ flex: 1, color: colors.textDark, fontWeight: "700", fontSize: compact ? 14 : 20, lineHeight: compact ? 20 : 25 }} selectable>
            {meal.name}
          </Text>
          <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: colors.secondary }}>
            <Text style={{ color: colors.primaryDark, fontWeight: "700", fontSize: 11 }} selectable>
              {meal.matchPercent == null ? meal.difficulty : `${meal.matchPercent}%`}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
            <FigmaAsset asset={exploreAssets.imgContainer16} />
            <Text style={{ color: colors.primaryDark, fontWeight: "600", fontSize: 12 }} selectable>
              {meal.time}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
            <FigmaAsset asset={homeAssets.imgContainer5} />
            <Text style={{ color: colors.primaryDark, fontWeight: "600", fontSize: 12 }} selectable>
              {meal.calories == null ? "Chưa có kcal" : `${meal.calories} kcal`}
            </Text>
          </View>
        </View>
        <View style={{ minHeight: 32, borderRadius: 8, backgroundColor: '#F1F1F1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Text style={{ color: '#0D2818', fontSize: 13, fontWeight: '600' }}>Xem công thức</Text><FigmaAsset asset={homeAssets.imgContainer6} />
        </View>
      </View>
    </Pressable>
  );
}
