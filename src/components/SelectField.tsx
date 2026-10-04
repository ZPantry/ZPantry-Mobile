import { useEffect } from "react";
import { Platform } from "react-native";
import Text from "@/components/AppText";
import { Host, Picker } from "@expo/ui";
import { View } from "react-native";
import { colors } from "@/constants/colors";

export type SelectOption = {
  label: string;
  value: string;
};

type Props = {
  label: string;
  displayLabel?: string;
  value: string;
  options: readonly SelectOption[];
  onValueChange: (value: string) => void;
  hint?: string;
  disabled?: boolean;
};

export default function SelectField({ label, value, options, onValueChange, hint, displayLabel, disabled = false }: Props) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.querySelectorAll('select[data-testid]').forEach(el => { if (el.getAttribute('data-testid') === `select-${label}`) el.setAttribute('aria-label', label); });
  }, [label]);
  const hasCurrentValue = options.some((option) => option.value === value);
  const displayedOptions = hasCurrentValue || !value ? options : [{ label: value, value }, ...options];

  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }} selectable>
        {displayLabel || label}
      </Text>
      <View
        style={{
          minHeight: 48,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: value ? colors.secondary : colors.input,
          borderWidth: 1,
          borderColor: colors.line,
          justifyContent: "center"
        }}
      >
        <Host style={{ width: "100%", minHeight: 46 }} seedColor={colors.primary} colorScheme="light">
          <Picker testID={`select-${label}`} selectedValue={value} onValueChange={onValueChange} appearance="menu" enabled={!disabled}>
            {displayedOptions.map((option) => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </Host>
      </View>
      {hint ? (
        <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: "700" }} selectable>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
