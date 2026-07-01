import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authApi } from "@/api/auth";
import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const fieldGlass = "rgba(255,255,255,0.22)";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const facebookDiscovery = {
  authorizationEndpoint: "https://www.facebook.com/v6.0/dialog/oauth",
  tokenEndpoint: "https://graph.facebook.com/v6.0/oauth/access_token"
};

type AuthMode = "login" | "register" | "otp";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const navigation = useNavigation<any>();
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
  const redirectUri = Platform.OS === "web" ? "http://localhost:8081" : "zpantry://auth";

  const googleConfig = useMemo(
    () => ({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "missing-google-web-client-id",
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "missing-google-ios-client-id",
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "missing-google-android-client-id",
      redirectUri,
      selectAccount: true
    }),
    [redirectUri]
  );
  const facebookClientId = useMemo(() => process.env.EXPO_PUBLIC_FACEBOOK_APP_ID || process.env.EXPO_PUBLIC_FACEBOOK_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_FACEBOOK_WEB_CLIENT_ID || "missing-facebook-app-id", []);
  const isGoogleReady = !googleConfig.webClientId.startsWith("missing-");
  const isFacebookReady = !facebookClientId.startsWith("missing-");
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest(googleConfig);
  const [facebookRequest, facebookResponse, promptFacebookAsync] = AuthSession.useAuthRequest(
    {
      clientId: facebookClientId,
      scopes: ["public_profile"],
      responseType: AuthSession.ResponseType.Token,
      redirectUri,
      extraParams: { display: "popup" }
    },
    facebookDiscovery
  );

  useEffect(() => {
    console.log("Redirect URI:", redirectUri);
  }, [redirectUri]);

  useEffect(() => {
    console.log("Google response:", googleResponse);
  }, [googleResponse]);

  useEffect(() => {
    console.log("Facebook response:", facebookResponse);
  }, [facebookResponse]);

  useEffect(() => {
    if (!facebookRequest) return;
    facebookRequest
      .makeAuthUrlAsync(facebookDiscovery)
      .then((url) => console.log("Facebook auth URL:", url))
      .catch((error: Error) => console.log("Facebook auth URL error:", error.message));
  }, [facebookRequest]);

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

  const validateLogin = () => validateEmail() || validatePassword();

  const validateRegister = () => {
    if (!fullName.trim()) return "Vui lòng nhập họ và tên.";
    if (fullName.trim().length < 2) return "Họ và tên quá ngắn.";
    return validateEmail() || validatePassword();
  };

  const validateOtp = () => {
    const emailError = validateEmail();
    if (emailError) return emailError;
    if (!otpCode.trim()) return "Vui lòng nhập mã OTP.";
    if (!/^\d{4,8}$/.test(otpCode.trim())) return "Mã OTP phải gồm 4-8 chữ số.";
    return "";
  };

  const handleApiError = (error: unknown) => {
    setSuccessMessage("");
    setAuthMessage(error instanceof Error ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
  };

  const handleEmailLogin = async () => {
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
      await signIn(session);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
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

  const handleGoogleLogin = async () => {
    if (!isGoogleReady) {
      showMissingConfig("Google", "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID");
      return;
    }
    setAuthMessage("");
    const result = await promptGoogleAsync();
    console.log("Google prompt result:", result);
  };

  const handleFacebookLogin = async () => {
    if (!isFacebookReady) {
      showMissingConfig("Facebook", "EXPO_PUBLIC_FACEBOOK_APP_ID");
      return;
    }
    setAuthMessage("");
    const result = await promptFacebookAsync({ useProxy: false } as never);
    console.log("Facebook prompt result:", result);
  };

  useEffect(() => {
    if (googleResponse?.type === "error") {
      setAuthMessage(googleResponse.error?.message || "Google không thể hoàn tất đăng nhập.");
      return;
    }
    const accessToken = googleResponse?.type === "success" ? googleResponse.authentication?.accessToken || googleResponse.params.access_token : undefined;
    if (!accessToken) return;

    fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.json())
      .then((profile) =>
        signIn({
          fullName: profile.name || "Google User",
          email: profile.email || "google@zpantry.local",
          accessToken,
          refreshToken: "",
          userId: profile.sub || "google-user",
          role: "user",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        })
      )
      .then(() => navigation.reset({ index: 0, routes: [{ name: "Tabs" }] }))
      .catch((error: Error) => setAuthMessage(error.message));
  }, [googleResponse, navigation, signIn]);

  useEffect(() => {
    if (facebookResponse?.type === "error") {
      setAuthMessage(facebookResponse.error?.message || "Facebook không thể hoàn tất đăng nhập.");
      return;
    }
    const accessToken = facebookResponse?.type === "success" ? facebookResponse.authentication?.accessToken || facebookResponse.params.access_token : undefined;
    if (!accessToken) return;

    fetch(`https://graph.facebook.com/me?fields=id,name,picture.type(large)&access_token=${accessToken}`)
      .then((res) => res.json())
      .then((profile) =>
        signIn({
          fullName: profile.name || "Facebook User",
          email: `facebook-${profile.id || "user"}@zpantry.local`,
          accessToken,
          refreshToken: "",
          userId: profile.id || "facebook-user",
          role: "user",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        })
      )
      .then(() => navigation.reset({ index: 0, routes: [{ name: "Tabs" }] }))
      .catch((error: Error) => setAuthMessage(error.message));
  }, [facebookResponse, navigation, signIn]);

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
              {mode === "register" ? "Đăng ký để bắt đầu kế hoạch bữa ăn" : mode === "otp" ? "Nhập mã được gửi tới Gmail của bạn" : "Bắt đầu cảm hứng cho bữa ăn cùng Z-Pantry"}
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
                  {mode === "login" ? (
                    <Pressable hitSlop={8}>
                      <Text style={{ color: colors.text, fontSize: 11, fontWeight: "900" }} selectable>
                        Quên mật khẩu?
                      </Text>
                    </Pressable>
                  ) : null}
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

          {mode === "login" ? (
            <View style={{ alignItems: "center", gap: 13, marginTop: 18 }}>
              <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "700" }} selectable>
                Hoặc tiếp tục với
              </Text>
              <View style={{ flexDirection: "row", gap: 11 }}>
                <SocialButton label="Google" icon="google" disabled={!googleRequest} onPress={handleGoogleLogin} />
                <SocialButton label="Facebook" icon="facebook" disabled={!facebookRequest} onPress={handleFacebookLogin} />
              </View>
            </View>
          ) : null}

          <View style={{ flex: 1 }} />

          {mode === "login" ? (
            <Pressable onPress={() => setModeAndClearMessages("register")} hitSlop={8} style={{ alignItems: "center", marginTop: 28 }}>
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
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
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
