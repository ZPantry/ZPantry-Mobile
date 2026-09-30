import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";




import type { ComponentProps } from "react";
import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authApi } from "@/api/auth";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getFriendlyErrorMessage } from "@/utils/localize";

const fieldGlass = "rgba(255,255,255,0.22)";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


type AuthMode = "login" | "register" | "otp";



export default function LoginScreen() {

  const { signIn } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [authMessage, setAuthMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setModeAndClearMessages = (nextMode: AuthMode) => {
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
    const basicError = validateEmail() || validatePassword();
    if (basicError) return basicError;
    const candidate = password.trim().toLowerCase();
    if (candidate.startsWith("hashed_") || /^\$(2[aby]|argon2|scrypt)\$/.test(candidate)) {
      return "Đây là giá trị mật khẩu đã băm trong cơ sở dữ liệu, không phải mật khẩu để đăng nhập. Hãy dùng mật khẩu gốc hoặc đặt lại mật khẩu admin trên server.";
    }
    return "";
  };

  const validateRegister = () => {
    if (!fullName.trim()) return "Vui lòng nhập họ và tên.";
    if (fullName.trim().length < 2) return "Họ và tên quá ngắn.";
    return validateEmail() || validatePassword();
  };

  const validateOtp = () => {
    const emailError = validateEmail();
    if (emailError) return emailError;
    if (!otpCode.trim()) return "Vui lòng nhập mã OTP.";
    if (!/^\d{6}$/.test(otpCode.trim())) return "Mã OTP phải gồm 6 chữ số.";
    return "";
  };

  const handleApiError = (error: unknown) => {
    setSuccessMessage("");
    setAuthMessage(getFriendlyErrorMessage(error, "Đã có lỗi xảy ra. Vui lòng thử lại.", "auth"));
  };

  const handleEmailLogin = async () => {
    if (isSubmitting) return;
    const validationError = validateLogin();
    if (validationError) {
      setSuccessMessage("");
      setAuthMessage(validationError);
      return;
    }
    if (!acceptedTerms) {
      setSuccessMessage("");
      setAuthMessage("Vui lòng đồng ý điều khoản dịch vụ trước khi đăng nhập.");
      return;
    }

    setIsSubmitting(true);
    setAuthMessage("");
    setSuccessMessage("");
    try {
      const session = await authApi.login({ email: email.trim(), password });
      await signIn(session, rememberMe);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (isSubmitting) return;
    const validationError = validateRegister();
    if (validationError) {
      setSuccessMessage("");
      setAuthMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setAuthMessage("");
    setSuccessMessage("");
    try {
      const response = await authApi.register({ fullName: fullName.trim(), email: email.trim(), password });
      setSuccessMessage(response.message);
      setMode("otp");
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isSubmitting) return;
    const validationError = validateOtp();
    if (validationError) {
      setSuccessMessage("");
      setAuthMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setAuthMessage("");
    setSuccessMessage("");
    try {
      const response = await authApi.verifyOtp({ email: email.trim(), otpCode: otpCode.trim() });
      setSuccessMessage(response.message);
      setMode("login");
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryAction = mode === "register" ? handleRegister : mode === "otp" ? handleVerifyOtp : handleEmailLogin;
  const primaryTitle = isSubmitting ? "Đang xử lý..." : mode === "register" ? "Đăng ký" : mode === "otp" ? "Xác thực OTP" : "Đăng nhập";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 31, paddingTop: 34, paddingBottom: 28 }}>
        <View style={{ flex: 1, minHeight: 650 }}>
          <Image source={require("../../assets/images/z-pantry-logo.png")} resizeMode="contain" style={{ width: 224, height: 86, alignSelf: "flex-start" }} />

          <View style={{ gap: 3, marginTop: mode === "login" ? 0 : 8 }}>
            <Text style={{ color: colors.text, fontSize: 25, lineHeight: 31, fontWeight: "900" }} selectable>
              {mode === "register" ? "Tạo tài khoản" : mode === "otp" ? "Xác thực OTP" : "Chào mừng trở lại!"}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, fontWeight: "800" }} selectable>
              {mode === "register" ? "Đăng ký để bắt đầu kế hoạch bữa ăn" : mode === "otp" ? "Nhập mã xác thực gồm 6 chữ số" : "Bắt đầu cảm hứng cho bữa ăn cùng Z-Pantry"}
            </Text>
          </View>

          <View style={{ gap: 16, marginTop: 17 }}>
            {mode === "register" ? <AuthInput icon="person" label="Họ và tên" placeholder="Họ và tên" value={fullName} onChangeText={setFullName} /> : null}
            <AuthInput icon="mail" label="Email" placeholder="email@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

            {mode === "otp" ? (
              <AuthInput icon="keypad" label="Mã OTP" placeholder="Nhập mã OTP" value={otpCode} onChangeText={setOtpCode} keyboardType="number-pad" />
            ) : (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <Text style={{ color: colors.text, fontWeight: "800" }} selectable>
                    Mật khẩu
                  </Text>
                  
                </View>
                <View style={{ minHeight: 48, borderRadius: 8, borderCurve: "continuous", backgroundColor: fieldGlass, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 12 }}>
                  <Ionicons name="lock-closed" size={18} color={colors.white} />
                  <TextInput value={password} onChangeText={setPassword} secureTextEntry={!isPasswordVisible} placeholder="Nhập mật khẩu" placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "700", paddingVertical: 0 }} />
                  <Pressable onPress={() => setIsPasswordVisible((value) => !value)} hitSlop={8}>
                    <Ionicons name={isPasswordVisible ? "eye-off" : "eye"} size={19} color={colors.white} />
                  </Pressable>
                </View>
              </View>
            )}

            {mode === "login" ? (
              <View style={{ gap: 8 }}>
                <CheckboxLine label="Ghi nhớ đăng nhập" checked={rememberMe} onPress={() => setRememberMe((value) => !value)} />
                <CheckboxLine label="Tôi đồng ý với điều khoản dịch vụ và chính sách bảo mật của Z-Pantry" checked={acceptedTerms} onPress={() => setAcceptedTerms((value) => !value)} />
              </View>
            ) : null}

            {authMessage ? <Message text={authMessage} tone="danger" /> : null}
            {mode === "login" && <Pressable accessibilityRole="button" onPress={() => setModeAndClearMessages("otp")}><Text style={{color: colors.primary, fontWeight: "800"}}>Đã đăng ký? Nhập mã xác thực</Text></Pressable>}
            {successMessage ? <Message text={successMessage} tone="success" /> : null}

            <Pressable
              disabled={isSubmitting}
              onPress={primaryAction}
              style={({ pressed }) => ({
                minHeight: 54,
                borderRadius: 9,
                borderCurve: "continuous",
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                opacity: isSubmitting ? 0.62 : pressed ? 0.82 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }]
              })}
            >
              <Text style={{ color: colors.white, fontSize: 16, fontWeight: "900" }} selectable>
                {primaryTitle}
              </Text>
            </Pressable>
          </View>

        

          <View style={{ flex: 1 }} />

          {mode === "login" ? (
            <Pressable onPress={() => setModeAndClearMessages("register")} hitSlop={8} style={{ alignItems: "center", marginTop: 10 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }} selectable>
                Chưa có tài khoản? <Text style={{ fontWeight: "900" }}>Đăng ký</Text>
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setModeAndClearMessages("login")} hitSlop={8} style={{ alignItems: "center", marginTop: 28 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "800" }} selectable>
                Quay lại đăng nhập
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AuthInput({ label, icon, value, placeholder, onChangeText, keyboardType, autoCapitalize }: AuthInputProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.text, fontWeight: "800" }} selectable>
        {label}
      </Text>
      <View style={{ minHeight: 48, borderRadius: 8, borderCurve: "continuous", backgroundColor: fieldGlass, borderWidth: 1, borderColor: colors.line, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 12 }}>
        <Ionicons name={icon} size={18} color={colors.white} />
        <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} autoCapitalize={autoCapitalize} placeholder={placeholder} placeholderTextColor={colors.muted} style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "700", paddingVertical: 0 }} />
      </View>
    </View>
  );
}

type AuthInputProps = {
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  keyboardType?: ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: ComponentProps<typeof TextInput>["autoCapitalize"];
};

function CheckboxLine({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={label} aria-checked={checked} accessibilityState={{ checked }} onPress={onPress} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <View style={{ width: 11, height: 11, marginTop: 3, borderRadius: 2, borderWidth: 1.2, borderColor: colors.text, backgroundColor: checked ? colors.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
        {checked ? <Ionicons name="checkmark" size={8} color={colors.white} /> : null}
      </View>
      <Text style={{ flex: 1, color: colors.muted, fontSize: 12, lineHeight: 16, fontWeight: "700" }} selectable>
        {label}
      </Text>
    </Pressable>
  );
}

function SocialButton({ label, icon, disabled, onPress }: { label: string; icon: "google" | "facebook"; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 46,
        minWidth: 0,
        borderRadius: 8,
        borderCurve: "continuous",
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.line,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
        opacity: disabled ? 0.58 : pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }]
      })}
    >
      <MaterialCommunityIcons name={icon} size={28} color={colors.text} />
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "800" }} selectable>
        {label}
      </Text>
    </Pressable>
  );
}

function Message({ text, tone }: { text: string; tone: "danger" | "success" }) {
  return (
    <Text style={{ color: tone === "danger" ? "#FFE6E6" : "#E8FFE8", fontSize: 12, lineHeight: 17, fontWeight: "800", textAlign: "center" }} selectable>
      {text}
    </Text>
  );
}

function showMissingConfig(provider: string, envName: string) {
  Alert.alert("Thiếu cấu hình đăng nhập", `Bạn cần tạo OAuth app cho ${provider}, điền ${envName} trong file .env rồi restart Expo.`);
}
