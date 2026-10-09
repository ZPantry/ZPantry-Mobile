import { forwardRef, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  type KeyboardAvoidingViewProps,
  type StyleProp,
  type ViewStyle,
  StyleSheet
} from "react-native";

export interface KeyboardSafeViewProps extends KeyboardAvoidingViewProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
}

/**
 * Standard keyboard avoidance wrapper for cross-platform Android & iOS.
 * On Android with windowSoftInputMode="adjustResize", behavior defaults to undefined
 * so the OS window resize handles the displacement cleanly without double-padding/jumping.
 * On iOS, behavior defaults to "padding".
 */
export const KeyboardSafeView = forwardRef<KeyboardAvoidingView, KeyboardSafeViewProps>(
  function KeyboardSafeView(
    {
      children,
      behavior = Platform.OS === "ios" ? "padding" : undefined,
      keyboardVerticalOffset = Platform.OS === "ios" ? 0 : 0,
      style,
      ...props
    },
    ref
  ) {
    return (
      <KeyboardAvoidingView
        ref={ref}
        behavior={behavior}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={[styles.container, style]}
        {...props}
      >
        {children}
      </KeyboardAvoidingView>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

export default KeyboardSafeView;
