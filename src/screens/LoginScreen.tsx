import { authStorage } from "@/utils/authStorage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/types";

import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import { AppState, ActivityIndicator, Pressable, TextInput, View } from "react-native";
import ScrollView from "@/components/ScreenScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { authApi } from "@/api/auth";
import { useUnavailableFeature } from "@/context/UnavailableFeatureContext";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getFriendlyErrorMessage } from "@/utils/localize";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";

import Text from '@/components/AppText';
import FigmaAsset from '@/components/FigmaAsset';
import { loginAssets as assets, registerAssets } from '@/constants/figmaAssets';

const fieldGlass = colors.input;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthMode = "login" | "register" | "otp";

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { signIn } = useAuth();
  const google = useGoogleSignIn();
  const showUnavailable = useUnavailableFeature();
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);
  const requestInFlight = useRef(false);
  const resendDeadlines = useRef<Record<string, number>>({});
  useEffect(() => {
    const update = () => setResendSeconds(Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    const subscription = AppState.addEventListener("change", update);
    return () => { clearInterval(timer); subscription.remove(); };
  }, [resendAvailableAt]);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setModeAndClearMessages = (nextMode: AuthMode) => {
    if (requestInFlight.current) return;
    if (nextMode === "otp") {
      const error = validateEmail();
      if (error) { setAuthMessage(error); setSuccessMessage(""); return; }
      const address = email.trim();
      setVerificationEmail(address);
      setOtpCode("");
      const deadline = resendDeadlines.current[address] ?? 0;
      setResendAvailableAt(deadline);
      setResendSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }
    setMode(nextMode);
    setAuthMessage("");
    setSuccessMessage("");
  };

  const validateEmail = () => {
    const value = email.trim();
    if (!value) return "Vui lòng nhập email.";
    if (!emailPattern.test(value)) return "Email không đúng định dạng.";
    return "";
  };

  const validatePassword = () => {
    if (!password.trim()) return "Vui lòng nhập mật khẩu.";
    if (password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự.";
    return "";
  };

  const validateLogin = () => {
    // Login validates existing credentials on the server; new-password policy
    // must not prevent a previously registered user from signing in.
    return validateEmail() || (!password ? "Vui lòng nhập mật khẩu." : "");
  };

  const validateRegister = () => {
    if (!fullName.trim()) return "Vui lòng nhập họ và tên.";
    if (fullName.trim().length < 2) return "Họ và tên quá ngắn.";
    return validateEmail() || validatePassword() || (password !== confirmPassword ? "Mật khẩu xác nhận chưa trùng khớp." : "") || (!acceptedTerms ? "Vui lòng đồng ý điều khoản dịch vụ." : "");
  };

  const validateOtp = () => {
    if (!verificationEmail) return "Vui lòng quay lại và nhập email đăng ký.";
    if (!otpCode.trim()) return "Vui lòng nhập mã OTP.";
    if (!/^\d{6}$/.test(otpCode.trim())) return "Mã OTP phải gồm 6 chữ số.";
    return "";
  };

  const handleApiError = (error: unknown) => {
    setSuccessMessage("");
    setAuthMessage(getFriendlyErrorMessage(error, "Đã có lỗi xảy ra. Vui lòng thử lại.", "auth"));
  };

  const handleEmailLogin = async () => {
    if (requestInFlight.current) return;
    const validationError = validateLogin();
    if (validationError) {
      setSuccessMessage("");
      setAuthMessage(validationError);
      return;
    }
    requestInFlight.current = true;
    setIsSubmitting(true);
    setAuthMessage("");
    setSuccessMessage("");
    try {
      const session = await authApi.login({ email: email.trim(), password });
      await signIn(session, rememberMe);
    } catch (error) {
      handleApiError(error);
    } finally {
      requestInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (requestInFlight.current) return;
    const validationError = validateRegister();
    if (validationError) {
      setSuccessMessage("");
      setAuthMessage(validationError);
      return;
    }

    requestInFlight.current = true;
    setIsSubmitting(true);
    setAuthMessage("");
    setSuccessMessage("");
    try {
      const address = email.trim();
      const response = await authApi.register({ fullName: fullName.trim(), email: address, password });
      setVerificationEmail(address);
      setEmail(address);
      setOtpCode("");
      const deadline = Date.now() + 60_000;
      resendDeadlines.current[address] = deadline;
      setResendAvailableAt(deadline);
      setResendSeconds(60);
      setSuccessMessage(response.message);
      setMode("otp");
    } catch (error) {
      handleApiError(error);
    } finally {
      requestInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (requestInFlight.current) return;
    if (mode === "register" && !acceptedTerms) {
      setSuccessMessage("");
      setAuthMessage("Vui lòng đồng ý điều khoản dịch vụ trước khi đăng nhập.");
      return;
    }
    requestInFlight.current = true;
    setIsSubmitting(true);
    setAuthMessage("");
    setSuccessMessage("");
    try {
      const idToken = await google.getIdToken();
      if (!idToken) return; // Closing the provider dialog is not a login failure.
      const session = await authApi.google(idToken);
      await signIn(session, rememberMe);
    } catch (error) {
      handleApiError(error);
    } finally {
      requestInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (requestInFlight.current) return;
    const validationError = validateOtp();
    if (validationError) {
      setSuccessMessage("");
      setAuthMessage(validationError);
      return;
    }

    requestInFlight.current = true;
    setIsSubmitting(true);
    setAuthMessage("");
    setSuccessMessage("");
    try {
      const response = await authApi.verifyOtp({ email: verificationEmail, otpCode: otpCode.trim() });
      await authStorage.markNewAccount(verificationEmail);
      setEmail(verificationEmail);
      setOtpCode("");
      setSuccessMessage(response.message);
      setMode("login");
    } catch (error) {
      handleApiError(error);
    } finally {
      requestInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const primaryAction = mode === "register" ? handleRegister : mode === "otp" ? handleVerifyOtp : handleEmailLogin;
  const primaryTitle = isSubmitting ? "Đang xử lý..." : mode === "register" ? "Đăng ký" : mode === "otp" ? "Xác thực OTP" : "Đăng nhập";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <ScrollView testID="login-scroll" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 80, maxWidth: 440, overflow: "hidden" }}>
        <View pointerEvents="none" style={{ position: "absolute", width: 1638, height: 1368, left: -599, top: -622 }}>
          <FigmaAsset asset={assets.imgVector1} style={{ width: 1638, height: 1368 }} />
        </View>
        <View style={{ paddingTop: 93, alignItems: "center" }}>
          <FigmaAsset asset={assets.imgLogoZPantryVer61} label="Z Pantry" />
          <Text style={{ marginTop: 22, paddingHorizontal: 16, color: colors.dark, fontFamily: "Inter_700Bold", fontSize: mode === "login" ? 30 : 24, lineHeight: 34, textAlign: "center", fontWeight: "700" }}>
            {mode === "register" ? "Bắt đầu hành trình ăn uống\nlành mạnh cùng Z - Pantry" : mode === "otp" ? "Xác thực tài khoản" : "Chào mừng trở lại!"}
          </Text>
          {mode !== "register" ? <Text style={{ marginTop: 4, color: colors.dark, fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 20, textAlign: "center" }}>
            {mode === "otp" ? "Nhập mã xác thực gồm 6 chữ số" : "Bắt đầu cảm hứng cho bữa ăn cùng Z-Pantry"}
          </Text> : null}
        </View>
        <View style={{ marginHorizontal: 19, marginTop: 26, padding: 24, borderRadius: 12, backgroundColor: colors.surface, boxShadow: "0 20px 25px -5px rgba(13,40,24,0.05), 0 8px 10px -6px rgba(13,40,24,0.05)" }}>
          {mode === "register" ? <View style={{ marginBottom: 16 }}><AuthInput icon="person" label="Họ và tên" placeholder="Nguyễn Văn A" value={fullName} onChangeText={setFullName} editable={!isSubmitting} /></View> : null}
          {mode !== "otp" ? <AuthInput icon="mail" label="Email" placeholder="bepviet@pantry.vn" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!isSubmitting} /> : (
            <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center" }}>Mã xác thực được gửi đến{"\n"}<Text style={{ color: colors.text, fontWeight: "600" }}>{verificationEmail}</Text></Text>
          )}
          <View style={{ marginTop: 16 }}>
            {mode === "otp" ? <AuthInput icon="keypad" label="Mã OTP" placeholder="Nhập mã OTP" value={otpCode} onChangeText={(v) => setOtpCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" editable={!isSubmitting} /> : (
              <View style={{ gap: 4 }}>
                <Text style={labelStyle}>Mật khẩu <Text style={{ color: colors.primary }}>*</Text></Text>
                <View style={inputStyle}>
                  <FigmaAsset asset={assets.imgContainer1} />
                  <TextInput accessibilityLabel="Mật khẩu" editable={!isSubmitting} autoComplete={mode === "register" ? "new-password" : "current-password"} autoCapitalize="none" autoCorrect={false} value={password} onChangeText={setPassword} secureTextEntry={!isPasswordVisible} placeholder={mode === "register" ? "Tối thiểu 8 ký tự" : "Nhập mật khẩu"} placeholderTextColor={colors.muted} style={textInputStyle} />
                  <Pressable accessibilityRole="button" accessibilityLabel={isPasswordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} accessibilityState={{ checked: isPasswordVisible }} disabled={isSubmitting} onPress={() => setIsPasswordVisible(v => !v)} hitSlop={12}>
                    <FigmaAsset asset={assets.imgContainer2} />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
          {mode === "register" ? <View style={{ marginTop: 16 }}>
            <View style={{ gap: 4 }}><Text style={labelStyle}>Xác nhận mật khẩu <Text style={{ color: colors.primary }}>*</Text></Text>
              <View style={inputStyle}><FigmaAsset asset={registerAssets.imgIcon4} /><TextInput accessibilityLabel="Xác nhận mật khẩu" value={confirmPassword} onChangeText={setConfirmPassword} editable={!isSubmitting} secureTextEntry={!isPasswordVisible} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" placeholder="Nhập lại mật khẩu" placeholderTextColor={colors.muted} style={textInputStyle} /></View>
            </View>
            <View style={{ marginTop: 20 }}><CheckboxLine label="Tôi đồng ý với Điều khoản dịch vụ & Chính sách bảo mật của Pantry." checked={acceptedTerms} disabled={isSubmitting} onPress={() => setAcceptedTerms(v => !v)} /></View>
          </View> : null}
          {mode === "login" ? <View style={{ marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <CheckboxLine label="Ghi nhớ đăng nhập" checked={rememberMe} disabled={isSubmitting} onPress={() => setRememberMe(v => !v)} />
            <Pressable accessibilityRole="button" accessibilityLabel="Quên mật khẩu" disabled={isSubmitting} onPress={() => navigation.navigate("ForgotPassword")} hitSlop={10}><Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "600" }}>Quên mật khẩu?</Text></Pressable>
          </View> : null}
          {authMessage ? <View style={{ marginTop: 16 }}><Message text={authMessage} tone="danger" /></View> : null}
          {successMessage ? <View style={{ marginTop: 16 }}><Message text={successMessage} tone="success" /></View> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={primaryTitle} accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }} disabled={isSubmitting} onPress={primaryAction}
            style={({ pressed }) => ({ marginTop: 20, minHeight: 52, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5, boxShadow: "0 4px 30px -2px rgba(239,157,31,0.6)", opacity: isSubmitting ? 0.62 : pressed ? 0.82 : 1 })}>
            {isSubmitting ? <ActivityIndicator color={colors.white} /> : null}
            <Text style={{ color: colors.white, fontSize: mode === "register" ? 16 : 20, fontWeight: "700", textAlign: "center" }}>{primaryTitle.toUpperCase()}</Text>
            {!isSubmitting ? <FigmaAsset asset={assets.imgContainer3} /> : null}
          </Pressable>
          {mode === "login" ? <View style={{ marginTop: 16, minHeight: 46, padding: 8, borderRadius: 8, backgroundColor: "rgba(203,234,209,0.2)", flexDirection: "row", alignItems: "center", gap: 8 }}>
            <FigmaAsset asset={assets.imgContainer4} /><Text style={{ flex: 1, color: "#324D3A", fontSize: 12, lineHeight: 15 }}>Tủ lạnh thông minh giúp giảm lãng phí thực phẩm hàng tháng.</Text>
          </View> : null}
          {mode === "otp" ? <Pressable accessibilityRole="button" accessibilityLabel="Gửi lại mã OTP" disabled={resendSeconds > 0 || isSubmitting} onPress={() => showUnavailable("Gửi lại mã OTP")} style={{ minHeight: 44, marginTop: 16, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: colors.primaryDark, fontSize: 12 }}>{resendSeconds > 0 ? "Gửi lại mã sau " + resendSeconds + "s" : "Gửi lại mã OTP · Sắp có"}</Text>
          </Pressable> : null}
        </View>
        <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => setModeAndClearMessages(mode === "login" ? "register" : "login")} style={{ minHeight: 44, marginTop: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Text style={{ color: "#424843", fontSize: 14 }}>{mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}</Text>
          <Text style={{ color: "#0D2818", fontSize: 15, fontWeight: "700" }}>{mode === "login" ? "Đăng ký ngay" : "Đăng nhập ngay"}</Text><FigmaAsset asset={assets.imgContainer5} />
        </Pressable>
        {mode !== "otp" ? <View style={{ marginTop: 32, marginHorizontal: 9, gap: 28 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}><View style={{ flex: 1, height: 1, backgroundColor: colors.line }} /><Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600", letterSpacing: 0.55 }}>HOẶC TIẾP TỤC VỚI</Text><View style={{ flex: 1, height: 1, backgroundColor: colors.line }} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Đăng nhập bằng Google" accessibilityState={{ disabled: isSubmitting || !google.ready, busy: isSubmitting }} disabled={isSubmitting || !google.ready} onPress={handleGoogleLogin}
            style={({ pressed }) => ({ alignSelf: "center", width: 114, height: 48, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", boxShadow: "0 1px 1px rgba(0,0,0,0.1)", opacity: !google.ready || isSubmitting ? 0.5 : pressed ? 0.75 : 1 })}>
            <FigmaAsset asset={assets.imgSvg} />
          </Pressable>
          {!google.ready ? <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center" }}>Google chưa được cấu hình trên phiên bản này.</Text> : null}
        </View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const labelStyle = { color: colors.text, fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 13, lineHeight: 16 };
const inputStyle = { minHeight: 48, borderRadius: 8, backgroundColor: fieldGlass, flexDirection: "row" as const, alignItems: "center" as const, paddingHorizontal: 16, gap: 12 };
const textInputStyle = { flex: 1, minWidth: 0, backgroundColor: "transparent", borderWidth: 0, color: colors.text, fontFamily: "BeVietnamPro_400Regular", fontSize: 14, paddingVertical: 12 };

function AuthInput({ label, icon, value, placeholder, onChangeText, keyboardType, autoCapitalize, editable = true }: AuthInputProps) {
  return <View style={{ gap: 4 }}>
    <Text style={labelStyle}>{label} <Text style={{ color: colors.primary }}>*</Text></Text>
    <View style={inputStyle}>
      {icon === "mail" ? <FigmaAsset asset={assets.imgContainer} /> : icon === "person" ? <FigmaAsset asset={registerAssets.imgIcon} /> : <Ionicons name={icon} size={18} color={colors.muted} />}
      <TextInput editable={editable} accessibilityLabel={label} value={value} onChangeText={onChangeText} keyboardType={keyboardType} autoCapitalize={autoCapitalize} autoCorrect={false} autoComplete={icon === "mail" ? "email" : icon === "keypad" ? "one-time-code" : "name"} maxLength={icon === "keypad" ? 6 : undefined} placeholder={placeholder} placeholderTextColor={colors.muted} style={textInputStyle} />
    </View>
  </View>;
}
type AuthInputProps = { editable?: boolean; label: string; icon: ComponentProps<typeof Ionicons>["name"]; value: string; placeholder: string; onChangeText: (value: string) => void; keyboardType?: ComponentProps<typeof TextInput>["keyboardType"]; autoCapitalize?: ComponentProps<typeof TextInput>["autoCapitalize"] };
function CheckboxLine({ label, checked, onPress, disabled = false }: { label: string; checked: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} aria-checked={checked} accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
    <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: "#EF9D1F", backgroundColor: checked ? "#0D2818" : colors.surface, alignItems: "center", justifyContent: "center" }}>
      {checked ? <FigmaAsset asset={assets.imgContainer6} style={{ width: 10.188, height: 7.516 }} /> : null}
    </View><Text style={{ flexShrink: 1, color: "#424843", fontSize: 12, lineHeight: 18 }}>{label}</Text>
  </Pressable>;
}
function Message({ text, tone }: { text: string; tone: "danger" | "success" }) {
  return <Text selectable accessibilityRole="alert" style={{ color: tone === "danger" ? colors.danger : colors.success, fontSize: 12, lineHeight: 18, textAlign: "center" }}>{text}</Text>;
}
