import { useEffect, useState } from "react";
import { Platform } from "react-native";
import Text from "@/components/AppText";
import SelectControl from './SelectControl';
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
  error?: string;
  disabled?: boolean;
};

export default function SelectField({ label, value, options, onValueChange, hint, error, displayLabel, disabled = false }: Props) {
  const [focused, setFocused] = useState(false);
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
          minHeight: 56,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: disabled ? colors.background : colors.input,
          borderWidth: 1,
          borderColor: error ? colors.danger : focused ? colors.primary : colors.inputBorder,
          justifyContent: "center"
        }}
      >
        <SelectControl label={label} value={value} options={displayedOptions} onValueChange={onValueChange} disabled={disabled} onFocusChange={setFocused} />
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 12, lineHeight: 16 }} selectable>
          {error}
        </Text>
      ) : hint ? (
        <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: "700" }} selectable>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
