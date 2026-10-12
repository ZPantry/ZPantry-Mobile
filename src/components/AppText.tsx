import { forwardRef } from 'react';
import { Text, StyleSheet, type TextProps } from 'react-native';
import { layoutTokens } from '@/constants/responsive';

export default forwardRef<Text, TextProps>(function AppText({ style, maxFontSizeMultiplier, allowFontScaling = true, ...props }, ref) {
  const current = StyleSheet.flatten(style);
  const weight = Number(current?.fontWeight ?? 400);
  const fontSize = Number(current?.fontSize ?? 14);
  const heading = fontSize >= 17 && weight >= 600;
  const fontFamily = heading
    ? weight >= 700 ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_600SemiBold'
    : weight >= 600 ? 'BeVietnamPro_600SemiBold' : weight >= 500 ? 'BeVietnamPro_500Medium' : 'BeVietnamPro_400Regular';

  // Smart max font multiplier based on text scale context:
  // - Small texts (badges, small buttons, sublabels <= 12): 1.3
  // - Medium buttons / tabs (13-16): 1.35
  // - Headings (>= 20): 1.4
  // - General body text: 1.5
  const defaultMultiplier =
    fontSize <= 12
      ? layoutTokens.maxFontScaleCaps.badge
      : fontSize <= 16 && weight >= 600
      ? layoutTokens.maxFontScaleCaps.button
      : fontSize >= 20
      ? layoutTokens.maxFontScaleCaps.header
      : layoutTokens.maxFontScaleCaps.body;

  const resolvedMultiplier = maxFontSizeMultiplier ?? defaultMultiplier;

  return (
    <Text
      ref={ref}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={resolvedMultiplier}
      {...props}
      style={[{ fontFamily }, style]}
    />
  );
});
