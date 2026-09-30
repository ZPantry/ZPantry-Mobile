import { Host, Picker } from "@expo/ui";
import { Text, View } from "react-native";
import { colors } from "@/constants/colors";

export type SelectOption = {
  label: string;
  value: string;
};

type Props = {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onValueChange: (value: string) => void;
  hint?: string;
};

export default function SelectField({ label, value, options, onValueChange, hint }: Props) {
  const hasCurrentValue = options.some((option) => option.value === value);
  const displayedOptions = hasCurrentValue || !value ? options : [{ label: value, value }, ...options];

  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900" }} selectable>
        {label}
      </Text>
      <View
        style={{
          minHeight: 48,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,0.14)",
          borderWidth: 1,
          borderColor: colors.line,
          justifyContent: "center"
        }}
      >
        <Host style={{ width: "100%", minHeight: 46 }} seedColor={colors.primary} colorScheme="dark">
          <Picker selectedValue={value} onValueChange={onValueChange} appearance="menu">
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
