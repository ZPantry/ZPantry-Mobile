import type { Insets } from "react-native";

export const layoutTokens = {
  // Max widths for readable content and forms
  formMaxWidth: 600,
  contentMaxWidth: 960,
  readingMaxWidth: 720,
  modalMaxWidth: 480,
  dialogMaxWidth: 420,

  // Accessible touch targets (Material Design: min 48x48dp)
  minTouchTarget: 48,

  // Hit slop presets to turn smaller icon buttons into 48x48dp touch targets
  hitSlop48From32: { top: 8, bottom: 8, left: 8, right: 8 } as Insets,
  hitSlop48From36: { top: 6, bottom: 6, left: 6, right: 6 } as Insets,
  hitSlop48From40: { top: 4, bottom: 4, left: 4, right: 4 } as Insets,
  hitSlop48From44: { top: 4, bottom: 4, left: 4, right: 4 } as Insets,

  // Font scale caps for accessibility while preventing broken layouts
  maxFontScaleCaps: {
    tabBar: 1.25,
    badge: 1.3,
    button: 1.35,
    header: 1.4,
    body: 1.5,
  }
} as const;
