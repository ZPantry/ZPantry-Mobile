import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Text from "@/components/AppText";
import ScrollView from "@/components/ScreenScrollView";
import PrimaryButton from "@/components/PrimaryButton";
import { colors, radius, shadows } from "@/constants/colors";
import { subscriptionApi, type Quota, type Subscription } from "@/api/subscription";
import type { RootStackParamList } from "@/types";
import { getFriendlyErrorMessage } from "@/utils/localize";

type Props = NativeStackScreenProps<RootStackParamList, "Subscription">;

function findQuota(quotas: Quota[], feature: Quota["feature"]) { return quotas.find(q => q.feature === feature); }
function quotaText(quota?: Quota) { return !quota || quota.remaining === null ? "Không giới hạn" : `${quota.remaining}/${quota.limit}`; }

function Benefit({ children }: { children: string }) {
  return <View style={{ flexDirection: "row", gap: 9, alignItems: "flex-start" }}>
    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 1 }}><MaterialCommunityIcons name="check" size={13} color={colors.white} /></View>
    <Text style={{ flex: 1, color: colors.text, fontSize: 12, lineHeight: 17 }}>{children}</Text>
  </View>;
}

function QuotaBox({ icon, title, value }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; title: string; value: string }) {
  return <View style={{ flex: 1, backgroundColor: "#FFF7EC", borderRadius: 11, padding: 10, gap: 5 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 4 }}><Text style={{ color: colors.muted, fontSize: 10 }}>{title}</Text><MaterialCommunityIcons name={icon} size={13} color={colors.primaryDark} /></View>
    <Text style={{ color: colors.text, fontWeight: "800", fontSize: 13 }}>{value}</Text>
    <Text style={{ color: colors.primaryDark, fontSize: 9 }}>còn lượt hôm nay</Text>
  </View>;
}

export default function SubscriptionScreen({ navigation, route }: Props) {
  const [data, setData] = useState<Subscription | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const load = () => subscriptionApi.current().then(setData).catch(cause => setError(getFriendlyErrorMessage(cause, "Chưa tải được gói sử dụng.")));
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const outcome = route.params?.paymentOutcome;
    if (!outcome) return;
    setNotice(outcome === "success" ? "Thanh toán đã được gửi. Đang tải lại trạng thái gói." : "Bạn đã hủy thanh toán.");
    void load();
  }, [route.params?.paymentOutcome]);

  const quotas = data?.quotas ?? [];
  const suggestion = useMemo(() => findQuota(quotas, "MEAL_SUGGESTION"), [quotas]);
  const ocr = useMemo(() => findQuota(quotas, "OCR"), [quotas]);
  const plus = data?.planCode === "Z_PLUS";
  const upgrade = async () => {
    setBusy(true); setError("");
    try {
      const payment = await subscriptionApi.checkout();
      if (!payment.checkoutUrl) throw new Error("PayOS chưa được cấu hình.");
      await Linking.openURL(payment.checkoutUrl);
    } catch (cause) { setError(getFriendlyErrorMessage(cause, "Chưa tạo được thanh toán.")); }
    finally { setBusy(false); }
  };

  if (!data && !error) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /></View>;
  return <ScrollView contentContainerStyle={{ paddingTop: 18, paddingBottom: 36, gap: 16, backgroundColor: colors.background }}>
    <View style={{ alignItems: "center", gap: 3, paddingHorizontal: 4 }}><Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>Gói Z-Pantry</Text><Text style={{ color: colors.muted, fontSize: 11 }}>Chọn gói phù hợp với nhu cầu nấu ăn của bạn</Text></View>
    {notice ? <Text accessibilityRole="alert" style={{ color: colors.primaryDark, textAlign: "center", fontSize: 12 }}>{notice}</Text> : null}
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: 15, gap: 12, borderWidth: 1, borderColor: colors.line, boxShadow: shadows.card }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}><View style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: "#F8F8F7", justifyContent: "center", alignItems: "center" }}><MaterialCommunityIcons name="crown-outline" size={21} color={colors.dark} /></View><View style={{ flex: 1 }}><Text style={{ color: colors.muted, fontWeight: "700", fontSize: 9, letterSpacing: .5 }}>GÓI HIỆN TẠI</Text><Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{plus ? "Z-Plus" : "Z-Free"}</Text></View></View>
      <View style={{ flexDirection: "row", gap: 9 }}><QuotaBox icon="silverware-fork-knife" title="Gợi ý món" value={quotaText(suggestion)} /><QuotaBox icon="receipt-text-outline" title="Quét OCR" value={quotaText(ocr)} /></View>
    </View>
    {!plus ? <View style={{ backgroundColor: "#FFF0DE", borderRadius: 20, padding: 16, gap: 13, borderWidth: 1, borderColor: "#FFCB91", boxShadow: "0 7px 18px rgba(241,117,14,0.12)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><View style={{ backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, flexDirection: "row", gap: 4, alignItems: "center" }}><MaterialCommunityIcons name="star" size={11} color={colors.white} /><Text style={{ color: colors.white, fontSize: 9, fontWeight: "700" }}>NÂNG CẤP LIỀN</Text></View><Text style={{ color: colors.warning, backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, fontSize: 9, fontWeight: "700" }}>Tiết kiệm 35%</Text></View>
      <View><Text style={{ color: colors.text, fontSize: 23, fontWeight: "800" }}>Z-Plus</Text><View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}><Text style={{ color: "#FA6500", fontSize: 22, fontWeight: "800" }}>49.000đ</Text><Text style={{ color: colors.text, fontSize: 11 }}>/ tháng</Text><Text style={{ color: colors.muted, fontSize: 9, textDecorationLine: "line-through" }}>79.000đ</Text></View></View>
      <View style={{ gap: 8 }}><Benefit>Gợi ý món không giới hạn cùng trợ lý AI Chef</Benefit><Benefit>5 lượt OCR mỗi ngày để quét nhanh hóa đơn & thực phẩm</Benefit><Benefit>Ưu tiên trải nghiệm nhanh hơn và tính năng thông minh mới</Benefit><Benefit>Không quảng cáo & tự động sao lưu dữ liệu đám mây</Benefit></View>
      <PrimaryButton title="Nâng cấp ngay  →" loading={busy} onPress={() => void upgrade()} style={{ minHeight: 50, backgroundColor: "#FA6500" }} />
    </View> : <View style={{ backgroundColor: colors.successSoft, borderRadius: radius.lg, padding: 16, gap: 8 }}><Text style={{ color: colors.success, fontWeight: "700", fontSize: 16 }}>Bạn đang dùng Z-Plus</Text><Text style={{ color: colors.text, fontSize: 12 }}>Gợi ý món không giới hạn và nhiều lượt quét OCR đã sẵn sàng.</Text><Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={{ minHeight: 40, justifyContent: "center" }}><Text style={{ color: colors.primaryDark, fontWeight: "700", fontSize: 12 }}>Quay lại ứng dụng →</Text></Pressable></View>}
    {error ? <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 12, textAlign: "center" }}>{error}</Text> : null}
  </ScrollView>;
}
