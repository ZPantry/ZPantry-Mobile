import { forwardRef } from "react";
import { ScrollView, type ScrollViewProps, StyleSheet } from "react-native";
import { layoutTokens } from "@/constants/responsive";

// Vertical screens share readable gutters; carousels keep their natural width.
const ScreenScrollView = forwardRef<ScrollView, ScrollViewProps>(function ScreenScrollView(
  { contentContainerStyle, horizontal, showsVerticalScrollIndicator = false, keyboardShouldPersistTaps = "handled", contentInsetAdjustmentBehavior = "automatic", ...props }, ref,
) {
  const current = StyleSheet.flatten(contentContainerStyle);
  const resolvedMaxWidth = current?.maxWidth ?? layoutTokens.contentMaxWidth;

  return (
    <ScrollView
      ref={ref}
      horizontal={horizontal}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
      {...props}
      contentContainerStyle={[
        contentContainerStyle,
        !horizontal && {
          width: "100%",
          maxWidth: resolvedMaxWidth,
          alignSelf: "center",
          paddingHorizontal: current?.paddingHorizontal ?? current?.padding ?? 16
        },
      ]}
    />
  );
});

export default ScreenScrollView;
