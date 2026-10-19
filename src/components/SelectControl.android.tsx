import { useEffect, useRef, useState } from 'react';
import { Host } from '@expo/ui';
import { DropdownMenuItem, ExposedDropdownMenu, ExposedDropdownMenuBox, Text, TextField, type TextFieldRef } from '@expo/ui/jetpack-compose';
import { background, fillMaxWidth, height, menuAnchor, onVisibilityChanged, testID } from '@expo/ui/jetpack-compose/modifiers';
import { colors } from '@/constants/colors';
import type { SelectControlProps } from './SelectControl';

// The universal Android Picker doesn't expose field colors/width modifiers.
// Use its same native menu primitives, with explicit Z-Pantry colors and sizing.
export default function SelectControl({ label, value, options, onValueChange, disabled, onFocusChange }: SelectControlProps) {
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const field = useRef<TextFieldRef>(null);
  const selectedLabel = options.find(option => option.value === value)?.label || '';
  useEffect(() => { if (visible) void field.current?.setText(selectedLabel); }, [selectedLabel, visible]);
  useEffect(() => { onFocusChange(expanded); }, [expanded, onFocusChange]);
  useEffect(() => { if (disabled) setExpanded(false); }, [disabled]);
  const textColor = disabled ? colors.muted : colors.text;
  const surface = disabled ? colors.background : colors.input;

  return <Host colorScheme="light" seedColor={colors.primary} style={{ width: '100%', height: 54 }}>
    <ExposedDropdownMenuBox expanded={expanded} onExpandedChange={disabled ? undefined : setExpanded} modifiers={[fillMaxWidth()]}>
      <TextField ref={field} readOnly singleLine enabled={!disabled}
        modifiers={[fillMaxWidth(), height(54), menuAnchor(), testID(`select-${label}`), onVisibilityChanged(setVisible)]}
        textStyle={{ color: textColor, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}
        colors={{
          focusedContainerColor: surface, unfocusedContainerColor: surface, disabledContainerColor: surface,
          focusedTextColor: textColor, unfocusedTextColor: textColor, disabledTextColor: colors.muted,
          focusedIndicatorColor: colors.transparent, unfocusedIndicatorColor: colors.transparent, disabledIndicatorColor: colors.transparent,
          cursorColor: colors.primary
        }} />
      <ExposedDropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)} containerColor={colors.surface}>
        {options.map(option => <DropdownMenuItem key={option.value} enabled={!disabled}
          modifiers={[background(option.value === value ? colors.secondary : colors.surface)]}
          elementColors={{ textColor: option.value === value ? colors.dark : colors.text }}
          onClick={() => { onValueChange(option.value); setExpanded(false); }}>
          <DropdownMenuItem.Text><Text color={option.value === value ? colors.dark : colors.text}
            style={{ fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>{option.label}</Text></DropdownMenuItem.Text>
        </DropdownMenuItem>)}
      </ExposedDropdownMenu>
    </ExposedDropdownMenuBox>
  </Host>;
}
