import { useEffect } from "react";
import { Platform } from "react-native";
import { colors } from "@/constants/colors";

// Browser autofill paints its own background after React Native Web styles.
// Keep saved credentials readable without the browser's white inner rectangle.
export default function WebFormStyles() {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const style = document.createElement("style");
    style.id = "zpantry-form-styles";
    style.textContent = `
      [data-testid="draggable-ai"] img { pointer-events: none; -webkit-user-drag: none; user-select: none; }
      select { color-scheme: light; background-color: ${colors.input} !important; color: ${colors.text} !important; border: 0 !important; border-radius: 0 !important; height: 54px !important; width: 100%; box-shadow: none !important; font-family: 'BeVietnamPro_400Regular', sans-serif !important; }
      select:disabled { background-color: ${colors.background} !important; color: ${colors.muted} !important; cursor: default; }
      [data-expo-ui-slider] { --_track-fill: ${colors.primary} !important; --_track-bg: ${colors.line} !important; min-height: 44px; touch-action: pan-y; }
      select:focus-visible { outline: 2px solid ${colors.primary} !important; outline-offset: -2px; }
      select option { background: ${colors.surface}; color: ${colors.text}; }
      select option:checked { background: ${colors.secondary}; }
      [data-expo-ui-slider]::-webkit-slider-thumb { border-color: ${colors.primary} !important; background: ${colors.primary} !important; }
      [data-expo-ui-slider]::-moz-range-thumb { border-color: ${colors.primary} !important; background: ${colors.primary} !important; }
      input, textarea { outline: none; }
      input:focus-visible, textarea:focus-visible { outline: 1px solid ${colors.primary}; outline-offset: 3px; }
      input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus,
      textarea:-webkit-autofill, textarea:-webkit-autofill:hover, textarea:-webkit-autofill:focus {
        -webkit-box-shadow: 0 0 0 1000px ${colors.background} inset !important;
        -webkit-text-fill-color: ${colors.text} !important;
        caret-color: ${colors.text};
      }
      input:autofill, textarea:autofill { box-shadow: 0 0 0 1000px ${colors.background} inset !important; }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);
  return null;
}
