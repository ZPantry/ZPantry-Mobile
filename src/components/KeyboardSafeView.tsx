import { forwardRef, useRef, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  type KeyboardAvoidingViewProps,
  type StyleProp,
  type ViewStyle,
  StyleSheet,
  View
} from "react-native";

export interface KeyboardSafeViewProps extends KeyboardAvoidingViewProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
}

/**
 * Standard keyboard avoidance wrapper for cross-platform Android & iOS.
 * Android edge-to-edge windows can overlay the IME despite adjustResize. Use the
 * keyboard frame to shrink the content; iOS uses padding below the stack header.
 */
export const KeyboardSafeView = forwardRef<KeyboardAvoidingView, KeyboardSafeViewProps>(
  function KeyboardSafeView(
    {
      children,
      behavior = Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined,
      keyboardVerticalOffset,
      onLayout,
      style,
      ...props
    },
    ref
  ) {
    const container = useRef<View | null>(null);
    const [top, setTop] = useState(0);
    return (
      <View ref={container} collapsable={false} style={styles.container} onLayout={() => {
        if (Platform.OS !== 'web') container.current?.measureInWindow((_x, y) => setTop(y));
      }}>
      <KeyboardAvoidingView
        ref={ref}
        behavior={behavior}
        keyboardVerticalOffset={keyboardVerticalOffset ?? top}
        onLayout={onLayout}
        style={[styles.container, style]}
        {...props}
      >
        {children}
      </KeyboardAvoidingView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

export default KeyboardSafeView;
