import { useCallback, useRef, useState } from "react";
import { BackHandler, Pressable, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Text from "@/components/AppText";
import PrimaryButton from "@/components/PrimaryButton";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import PolicyDocument from "./PolicyDocument";

export default function PolicyScreen() {
  const { completeOnboardingStep } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, []));

  const goHome = async () => {
    if (!agreed || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      await completeOnboardingStep("done");
    } catch {
      setError("Chưa lưu được xác nhận. Vui lòng thử lại.");
      busy.current = false;
      setSaving(false);
    }
  };

  return <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ flex: 1 }}><PolicyDocument /></View>
    <View style={{ padding: 16, gap: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.line }}>
      <Pressable testID="policy-agreement" accessibilityRole="checkbox" accessibilityState={{ checked: agreed, disabled: saving }} disabled={saving} onPress={() => setAgreed(value => !value)} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 }}>
        <View style={{ width: 24, height: 24, borderWidth: 2, borderColor: colors.primary, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: agreed ? colors.primary : colors.surface }}>
          {agreed ? <Text style={{ color: colors.white, fontWeight: "700" }}>✓</Text> : null}
        </View>
        <Text style={{ flex: 1, color: colors.text, lineHeight: 22 }}>Tôi đã đọc và đồng ý với điều khoản và chính sách của ứng dụng</Text>
      </Pressable>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
      {agreed ? <PrimaryButton title="Về trang chính" disabled={saving} onPress={() => void goHome()} /> : null}
    </View>
  </SafeAreaView>;
}
