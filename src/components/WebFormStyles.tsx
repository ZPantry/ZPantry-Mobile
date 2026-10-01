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
      input, textarea { background-color: transparent !important; outline: none; }
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
