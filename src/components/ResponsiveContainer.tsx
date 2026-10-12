import { forwardRef, type ReactNode } from "react";
import { View, StyleSheet, type ViewProps, type StyleProp, type ViewStyle } from "react-native";
import { layoutTokens } from "@/constants/responsive";

export interface ResponsiveContainerProps extends ViewProps {
  children?: ReactNode;
  maxWidth?: number;
  variant?: "form" | "content" | "reading" | "modal" | "full";
  style?: StyleProp<ViewStyle>;
}

export const ResponsiveContainer = forwardRef<View, ResponsiveContainerProps>(
  function ResponsiveContainer({ children, maxWidth, variant = "content", style, ...props }, ref) {
    const defaultMaxWidth =
      maxWidth ??
      (variant === "form"
        ? layoutTokens.formMaxWidth
        : variant === "reading"
        ? layoutTokens.readingMaxWidth
        : variant === "modal"
        ? layoutTokens.modalMaxWidth
        : variant === "full"
        ? 1200
        : layoutTokens.contentMaxWidth);

    return (
      <View
        ref={ref}
        {...props}
        style={[
          styles.container,
          { maxWidth: defaultMaxWidth },
          style
        ]}
      >
        {children}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignSelf: "center",
  }
});

export default ResponsiveContainer;
