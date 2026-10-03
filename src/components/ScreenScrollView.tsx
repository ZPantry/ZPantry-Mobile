import { forwardRef } from "react";
import { ScrollView, type ScrollViewProps, StyleSheet } from "react-native";

// Vertical screens share readable gutters; carousels keep their natural width.
const ScreenScrollView = forwardRef<ScrollView, ScrollViewProps>(function ScreenScrollView(
  { contentContainerStyle, horizontal, ...props }, ref,
) {
  const current = StyleSheet.flatten(contentContainerStyle);
  return <ScrollView ref={ref} horizontal={horizontal} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
    contentInsetAdjustmentBehavior="automatic" {...props}
    contentContainerStyle={[contentContainerStyle,
      !horizontal && { width: "100%", maxWidth: current?.maxWidth ?? 1080, alignSelf: "center", paddingHorizontal: current?.paddingHorizontal ?? current?.padding ?? 16 },
    ]} />;
});
export default ScreenScrollView;
