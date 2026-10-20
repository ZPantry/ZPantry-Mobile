import { WebView } from "react-native-webview";
import { policyHtml } from "@/generated/policyHtml";
import { termsHtml } from "@/generated/termsHtml";

export default function PolicyDocument({ type = "policy" }: { type?: "policy" | "terms" }) {
  return <WebView testID={`${type}-document`} style={{ flex: 1 }} originWhitelist={["*"]} source={{ html: type === "terms" ? termsHtml : policyHtml }} />;
}
