import { forwardRef } from 'react';
import { Text, StyleSheet, type TextProps } from 'react-native';

export default forwardRef<Text, TextProps>(function AppText({ style, ...props }, ref) {
  const current = StyleSheet.flatten(style);
  const weight = Number(current?.fontWeight ?? 400);
  const heading = Number(current?.fontSize ?? 14) >= 17 && weight >= 600;
  const fontFamily = heading
    ? weight >= 700 ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold'
    : weight >= 600 ? 'BeVietnamPro_600SemiBold' : weight >= 500 ? 'BeVietnamPro_500Medium' : 'BeVietnamPro_400Regular';
  return <Text ref={ref} {...props} style={[{ fontFamily }, style]} />;
});
