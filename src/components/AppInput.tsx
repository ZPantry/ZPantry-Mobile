import { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { colors } from '@/constants/colors';

/** A clear input surface, including when the surrounding card is white. */
export default forwardRef<TextInput, TextInputProps>(function AppInput({ style, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return <TextInput ref={ref} {...props} placeholderTextColor={props.placeholderTextColor || colors.muted}
    onFocus={e => { setFocused(true); onFocus?.(e); }} onBlur={e => { setFocused(false); onBlur?.(e); }}
    style={[style, { minHeight: 48, backgroundColor: colors.surface, color: colors.text, borderWidth: 1.5,
      borderColor: focused ? colors.primary : '#B7C2B9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 }]} />;
});
