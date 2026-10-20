import { policyHtml } from "@/generated/policyHtml";
import { termsHtml } from "@/generated/termsHtml";

export default function PolicyDocument({ type = "policy" }: { type?: "policy" | "terms" }) {
  return <iframe title={type === "terms" ? "Điều khoản dịch vụ Z-Pantry" : "Chính sách quyền riêng tư Z-Pantry"} srcDoc={type === "terms" ? termsHtml : policyHtml} sandbox="" style={{ width: "100%", height: "100%", border: 0 }} />;
}
