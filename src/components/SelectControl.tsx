import { Host, Picker } from '@expo/ui';
import { colors } from '@/constants/colors';
import type { SelectOption } from './SelectField';

export type SelectControlProps = {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onValueChange: (value: string) => void;
  disabled: boolean;
  onFocusChange: (focused: boolean) => void;
};

// Keep the native iOS menu and the accessible HTML select on web.
export default function SelectControl({ label, value, options, onValueChange, disabled }: SelectControlProps) {
  return <Host style={{ width: '100%', minHeight: 54 }} seedColor={colors.primary} colorScheme="light">
    <Picker testID={`select-${label}`} selectedValue={value} onValueChange={onValueChange} appearance="menu" enabled={!disabled}>
      {options.map(option => <Picker.Item key={option.value} label={option.label} value={option.value} />)}
    </Picker>
  </Host>;
}
