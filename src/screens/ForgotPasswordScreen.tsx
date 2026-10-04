import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { authApi } from "@/api/auth";
import Text from "@/components/AppText";
import AppBackButton from "@/components/AppBackButton";
import PrimaryButton from "@/components/PrimaryButton";
import ScrollView from "@/components/ScreenScrollView";
import { colors } from "@/constants/colors";
import { getFriendlyErrorMessage } from "@/utils/localize";
import type { RootStackParamList } from "@/types";

export default function ForgotPasswordScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "ForgotPassword">) {
  const [step, setStep] = useState<"email" | "otp" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    const update = () => setRemaining(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update(); const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);

  const sendCode = async () => {
    if (lock.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Vui lòng nhập email hợp lệ."); return; }
    if (Date.now() < resendAt) { setError("Vui lòng chờ một phút trước khi gửi lại mã."); return; }
    lock.current = true; setBusy(true); setError(""); setMessage("");
    try {
      await authApi.forgotPassword(email);
      setEmail(email.trim()); setStep("otp"); setOtpCode(""); setResendAt(Date.now() + 60_000);
      setMessage("Nếu email đã được đăng ký, mã đặt lại mật khẩu sẽ được gửi đến hộp thư của bạn. Kiểm tra cả thư rác.");
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa gửi được mã. Vui lòng thử lại.", "auth")); }
    finally { lock.current = false; setBusy(false); }
  };
  const verify = async () => {
    if (lock.current) return;
    if (!/^\d{6}$/.test(otpCode)) { setError("Mã OTP phải gồm 6 chữ số."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      const verified = await authApi.verifyPasswordResetOtp({ email, otpCode });
      setStep("reset");
      setMessage(verified ? "Mã OTP đã được xác thực. Bạn có thể tạo mật khẩu mới." : "Mã sẽ được máy chủ xác thực khi bạn lưu mật khẩu mới.");
    } catch (e) { setError(getFriendlyErrorMessage(e, "Mã OTP không đúng hoặc đã hết hạn.", "auth")); }
    finally { lock.current = false; setBusy(false); }
  };
  const reset = async () => {
    if (lock.current) return;
    if (!/^\d{6}$/.test(otpCode)) { setError("Mã OTP phải gồm 6 chữ số."); return; }
    if (password.length < 8 || password.length > 200) { setError("Mật khẩu mới cần từ 8 đến 200 ký tự."); return; }
    if (password !== confirm) { setError("Mật khẩu xác nhận chưa trùng khớp."); return; }
    lock.current = true; setBusy(true); setError(""); setMessage("");
    try {
      await authApi.resetPassword({ email, otpCode, newPassword: password, confirmPassword: confirm });
      setPassword(""); setConfirm(""); setOtpCode(""); setStep("done");
    } catch (e) { setError(getFriendlyErrorMessage(e, "Chưa đặt lại được mật khẩu. Kiểm tra mã OTP rồi thử lại.", "auth")); }
    finally { lock.current = false; setBusy(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, maxWidth: 480, padding: 24, paddingBottom: 48, gap: 24 }}>
        <AppBackButton onPress={() => { if (!busy) navigation.goBack(); }} />
        <View style={{ gap: 12, paddingTop: 12 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: step === "done" ? colors.successSoft : colors.secondary, justifyContent: "center", alignItems: "center" }}>
            <Ionicons name={step === "done" ? "checkmark-circle-outline" : "lock-closed-outline"} size={32} color={step === "done" ? colors.success : colors.primaryDark} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.dark }}>{step === "done" ? "Mật khẩu đã được đổi" : step === "email" ? "Quên mật khẩu?" : step === "otp" ? "Nhập mã OTP" : "Tạo mật khẩu mới"}</Text>
          <Text style={{ color: colors.muted, lineHeight: 23 }}>{step === "done" ? "Đăng nhập lại bằng mật khẩu mới để tiếp tục chăm sóc căn bếp của bạn." : step === "email" ? "Nhập email đăng ký. Chúng tôi sẽ gửi mã OTP để bạn lấy lại quyền truy cập." : step === "otp" ? "Kiểm tra hộp thư và nhập mã 6 chữ số đã được gửi đến bạn." : "Chọn mật khẩu mới để bảo vệ tài khoản của bạn."}</Text>
        </View>
        {step !== "done" ? <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, gap: 18, boxShadow: "0 4px 20px rgba(0,48,20,0.05)" }}>
          <Field label="Email đăng ký" value={email} onChange={setEmail} disabled={busy || step !== "email"} email />
          {step === "otp" ? <>
            <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 20 }}>Mã được gửi đến {email}</Text>
            <Field label="Mã OTP" value={otpCode} onChange={v => setOtpCode(v.replace(/\D/g, "").slice(0, 6))} disabled={busy} otp />
          </> : null}
          {step === "reset" ? <>
            <Field label="Mật khẩu mới" value={password} onChange={setPassword} disabled={busy} secret={!visible} password />
            <Field label="Xác nhận mật khẩu mới" value={confirm} onChange={setConfirm} disabled={busy} secret={!visible} password />
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => setVisible(v => !v)} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ color: colors.primaryDark }}>{visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}</Text>
            </Pressable>
          </> : null}
          {step === "reset" ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setStep("otp"); setError(""); setMessage(""); }} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ color: colors.primaryDark }}>‹ Nhập lại mã OTP</Text></Pressable> : null}
          {message ? <Text selectable accessibilityLiveRegion="polite" style={{ backgroundColor: colors.successSoft, padding: 12, borderRadius: 12, color: colors.success, lineHeight: 21 }}>{message}</Text> : null}
          {error ? <Text selectable accessibilityRole="alert" style={{ color: colors.danger, backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 12, lineHeight: 21 }}>{error}</Text> : null}
          <PrimaryButton title={step === "email" ? "Gửi mã OTP" : step === "otp" ? (authApi.canVerifyPasswordResetOtp ? "Xác thực mã OTP" : "Tiếp tục") : "Đặt lại mật khẩu"} loading={busy} onPress={step === "email" ? sendCode : step === "otp" ? verify : reset} />
          {step === "otp" ? <>
            {!authApi.canVerifyPasswordResetOtp ? <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 20 }}>Mã OTP sẽ được xác thực cùng mật khẩu mới ở bước tiếp theo.</Text> : null}
            <PrimaryButton title={remaining ? `Gửi lại mã sau ${remaining}s` : "Gửi lại mã OTP"} variant="outline" disabled={busy || remaining > 0} onPress={sendCode} />
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setStep("email"); setOtpCode(""); setPassword(""); setConfirm(""); setError(""); setMessage(""); }} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.muted }}>Dùng email khác</Text></Pressable>
          </> : null}
        </View> : <PrimaryButton title="Quay lại đăng nhập" icon="login" onPress={() => navigation.goBack()} />}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
function Field({ label, value, onChange, disabled, secret, email, otp, password }: { label: string; value: string; onChange: (v: string) => void; disabled: boolean; secret?: boolean; email?: boolean; otp?: boolean; password?: boolean }) {
  return <View style={{ gap: 8 }}><Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    <View style={{ backgroundColor: colors.input, borderRadius: 12 }}><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} secureTextEntry={secret} autoCapitalize="none" autoCorrect={false}
      keyboardType={email ? "email-address" : otp ? "number-pad" : "default"} autoComplete={email ? "email" : otp ? "one-time-code" : password ? "new-password" : "off"}
      maxLength={otp ? 6 : password ? 200 : 254} placeholder={otp ? "6 chữ số" : password ? "Từ 8 đến 200 ký tự" : "ban@example.com"} placeholderTextColor={colors.muted}
      style={{ minHeight: 50, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15, opacity: disabled ? 0.65 : 1 }} /></View>
  </View>;
}
