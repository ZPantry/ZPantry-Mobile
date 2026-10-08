import { MaterialCommunityIcons } from "@expo/vector-icons";
import Text from "@/components/AppText";
import { Pressable, View } from "react-native";
import { allergens, type FoodAllergen } from "@/api/profile";
import { colors } from "@/constants/colors";
import FigmaAsset, { type DesignAsset } from './FigmaAsset';
import { surveyAssets as assets } from '@/constants/figmaAssets';

export default function AllergenChoices({ value, onChange, disabled = false }: {
  value: FoodAllergen[]; onChange: (value: FoodAllergen[]) => void; disabled?: boolean;
}) {
  const icons: Partial<Record<FoodAllergen, DesignAsset>> = { PEANUT: assets.imgContainer6,
    MILK: assets.imgContainer5, EGG: assets.imgContainer2, WHEAT: assets.imgContainer4,
    GLUTEN: assets.imgContainer4, SHELLFISH: assets.imgContainer7, FISH: assets.imgContainer7 };
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
    {allergens.map((option) => {
      const selected = value.includes(option.value);
      return <Pressable key={option.value} accessibilityRole="checkbox" aria-checked={selected} accessibilityState={{ checked: selected, disabled }}
        disabled={disabled} onPress={() => onChange(selected ? value.filter((v) => v !== option.value) : [...value, option.value])}
        style={{ width: '30%', flexGrow: 1, minHeight: 96, padding: 12, gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1,
          borderColor: selected ? colors.primary : colors.line, backgroundColor: selected ? colors.secondary : colors.card }}>
        {icons[option.value] ? <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8E8E6', alignItems: 'center', justifyContent: 'center' }}><FigmaAsset asset={icons[option.value]!} /></View> : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.input, alignItems: "center", justifyContent: "center" }}><MaterialCommunityIcons name={option.value === "TREE_NUT" ? "pine-tree" : option.value === "SOY" ? "sprout" : "seed"} size={22} color={colors.primaryDark} /></View>}
        <Text style={{ color: colors.text, fontSize: 11, textAlign: 'center', fontWeight: '600' }}>{option.label}</Text>
      </Pressable>;
    })}
    <Pressable accessibilityRole="checkbox" accessibilityLabel="Không dị ứng" aria-checked={!value.length} accessibilityState={{ checked: !value.length, disabled }} disabled={disabled} onPress={() => onChange([])}
      style={{ width: '30%', flexGrow: 1, minHeight: 96, padding: 12, gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: !value.length ? colors.primary : colors.line, backgroundColor: !value.length ? colors.secondary : colors.card }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#0D2818', alignItems: 'center', justifyContent: 'center' }}><FigmaAsset asset={assets.imgContainer3} /></View>
      <Text style={{ color: colors.text, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>Không dị ứng</Text>
    </Pressable>
  </View>;
}
