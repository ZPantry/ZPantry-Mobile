import { Pressable, Text, View } from "react-native";
import { allergens, type FoodAllergen } from "@/api/profile";
import { colors } from "@/constants/colors";

export default function AllergenChoices({ value, onChange, disabled = false }: {
  value: FoodAllergen[]; onChange: (value: FoodAllergen[]) => void; disabled?: boolean;
}) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
    {allergens.map((option) => {
      const selected = value.includes(option.value);
      return <Pressable key={option.value} accessibilityRole="checkbox" aria-checked={selected} accessibilityState={{ checked: selected, disabled }}
        disabled={disabled} onPress={() => onChange(selected ? value.filter((v) => v !== option.value) : [...value, option.value])}
        style={{ minHeight: 44, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1,
          borderColor: selected ? colors.primary : colors.line, backgroundColor: selected ? colors.primary : colors.card }}>
        <Text style={{ color: selected ? colors.textDark : colors.text, fontWeight: "700" }}>{selected ? "✓ " : ""}{option.label}</Text>
      </Pressable>;
    })}
  </View>;
}
