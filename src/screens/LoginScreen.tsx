import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Facebook from "expo-auth-session/providers/facebook";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { Alert, ImageBackground, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/constants/colors";

const heroImage = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=85";
const glass = "rgba(238, 238, 238, 0.82)";
const fieldGlass = "rgba(245, 245, 245, 0.86)";
const textOnImage = "#F7F7F7";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("email@example.com");
  const [password, setPassword] = useState("12345678");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [authMessage, setAuthMessage] = useState("");

  const googleConfig = useMemo(
    () => ({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "missing-google-web-client-id",
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "missing-google-ios-client-id",
      androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "missing-google-android-client-id",
      selectAccount: true
    }),
    []
  );
  const facebookConfig = useMemo(
    () => ({
      webClientId: process.env.EXPO_PUBLIC_FACEBOOK_WEB_CLIENT_ID || "missing-facebook-web-client-id",
      iosClientId: process.env.EXPO_PUBLIC_FACEBOOK_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_FACEBOOK_WEB_CLIENT_ID || "missing-facebook-ios-client-id",
      androidClientId: process.env.EXPO_PUBLIC_FACEBOOK_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_FACEBOOK_WEB_CLIENT_ID || "missing-facebook-android-client-id"
    }),
    []
  );
  const isGoogleReady = !googleConfig.webClientId.startsWith("missing-");
  const isFacebookReady = !facebookConfig.webClientId.startsWith("missing-");
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest(googleConfig);
  const [facebookRequest, facebookResponse, promptFacebookAsync] = Facebook.useAuthRequest(facebookConfig);

  const goToApp = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Tabs" }]
    });
  };

  const handleEmailLogin = () => {
    if (!email.trim() || !password.trim()) {
      setAuthMessage("Vui lòng nhập email và mật khẩu.");
      return;
    }
    if (!acceptedTerms) {
      setAuthMessage("Vui lòng đồng ý điều khoản dịch vụ trước khi đăng nhập.");
      return;
    }
    goToApp();
  };

  const handleGoogleLogin = async () => {
    if (!isGoogleReady) {
      showMissingConfig("Google", "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID");
      return;
    }
    setAuthMessage("");
    await promptGoogleAsync();
  };

  const handleFacebookLogin = async () => {
    if (!isFacebookReady) {
      showMissingConfig("Facebook", "EXPO_PUBLIC_FACEBOOK_WEB_CLIENT_ID");
      return;
    }
    setAuthMessage("");
    await promptFacebookAsync();
  };

  useEffect(() => {
    const accessToken = googleResponse?.type === "success" ? googleResponse.authentication?.accessToken || googleResponse.params.access_token : undefined;
    if (!accessToken) return;

    fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
      .then((response) => {
        if (!response.ok) throw new Error("Không lấy được thông tin Google.");
        return response.json();
      })
      .then(() => goToApp())
      .catch((error: Error) => setAuthMessage(error.message));
  }, [googleResponse]);

  useEffect(() => {
    const accessToken = facebookResponse?.type === "success" ? facebookResponse.authentication?.accessToken || facebookResponse.params.access_token : undefined;
    if (!accessToken) return;

    fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`)
      .then((response) => {
        if (!response.ok) throw new Error("Không lấy được thông tin Facebook.");
        return response.json();
      })
      .then(() => goToApp())
      .catch((error: Error) => setAuthMessage(error.message));
  }, [facebookResponse]);

  return (
    <ImageBackground source={{ uri: heroImage }} resizeMode="cover" style={{ flex: 1, backgroundColor: colors.dark }}>
      <View style={{ flex: 1, backgroundColor: "rgba(91, 91, 91, 0.64)" }}>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 28 }}>
            <View style={{ flex: 1, justifyContent: "center", gap: 18, minHeight: 650 }}>
              <View style={{ width: 42, height: 42, borderRadius: 5, borderCurve: "continuous", backgroundColor: textOnImage, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="menu" size={30} color={colors.dark} />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ color: textOnImage, fontSize: 25, lineHeight: 31, fontWeight: "900" }} selectable>
                  Chào mừng trở lại!
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 14, fontWeight: "700" }} selectable>
                  Bắt đầu cảm hứng cho bữa ăn
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                <Text style={{ color: textOnImage, fontWeight: "800" }} selectable>
                  Email
                </Text>
                <View style={{ minHeight: 48, borderRadius: 9, borderCurve: "continuous", backgroundColor: fieldGlass, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 12 }}>
                  <Ionicons name="mail" size={18} color={colors.dark} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="email@example.com"
                    placeholderTextColor="#5C5C5C"
                    style={{ flex: 1, color: colors.dark, fontSize: 14, fontWeight: "700", paddingVertical: 0 }}
                  />
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <Text style={{ color: textOnImage, fontWeight: "800" }} selectable>
                    Mật khẩu
                  </Text>
                  <Pressable onPress={() => {}} hitSlop={8}>
                    <Text style={{ color: textOnImage, fontSize: 12, fontWeight: "800" }} selectable>
                      Quên mật khẩu?
                    </Text>
                  </Pressable>
                </View>
                <View style={{ minHeight: 48, borderRadius: 9, borderCurve: "continuous", backgroundColor: fieldGlass, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 12 }}>
                  <Ionicons name="lock-closed" size={18} color={colors.dark} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                    placeholder="Nhập mật khẩu"
                    placeholderTextColor="#5C5C5C"
                    style={{ flex: 1, color: colors.dark, fontSize: 14, fontWeight: "700", paddingVertical: 0 }}
                  />
                  <Pressable onPress={() => setIsPasswordVisible((value) => !value)} hitSlop={8}>
                    <Ionicons name={isPasswordVisible ? "eye-off" : "eye"} size={19} color={colors.dark} />
                  </Pressable>
                </View>
              </View>

              <View style={{ gap: 9 }}>
                <CheckboxLine label="Ghi nhớ đăng nhập" checked={rememberMe} onPress={() => setRememberMe((value) => !value)} />
                <CheckboxLine label="Tôi đồng ý với điều khoản dịch vụ và chính sách bảo mật của Z-Pantry" checked={acceptedTerms} onPress={() => setAcceptedTerms((value) => !value)} />
              </View>

              {authMessage ? (
                <Text style={{ color: "#FFF4F4", fontSize: 12, lineHeight: 16, fontWeight: "800", textAlign: "center" }} selectable>
                  {authMessage}
                </Text>
              ) : null}

              <Pressable
                onPress={handleEmailLogin}
                style={({ pressed }) => ({
                  minHeight: 52,
                  borderRadius: 10,
                  borderCurve: "continuous",
                  backgroundColor: glass,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.92)",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.82 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }]
                })}
              >
                <Text style={{ color: colors.dark, fontSize: 15, fontWeight: "900" }} selectable>
                  Đăng nhập
                </Text>
              </Pressable>

              <View style={{ alignItems: "center", gap: 12 }}>
                <Pressable onPress={() => {}} hitSlop={8}>
                  <Text style={{ color: textOnImage, fontSize: 13, fontWeight: "700" }} selectable>
                    Chưa có tài khoản? Đăng ký
                  </Text>
                </Pressable>
                <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: "700" }} selectable>
                  Hoặc tiếp tục với
                </Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <SocialButton label="Google" icon="google" disabled={!googleRequest} onPress={handleGoogleLogin} />
                  <SocialButton label="Facebook" icon="facebook" disabled={!facebookRequest} onPress={handleFacebookLogin} />
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

type CheckboxLineProps = {
  label: string;
  checked: boolean;
  onPress: () => void;
};

function CheckboxLine({ label, checked, onPress }: CheckboxLineProps) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <View style={{ width: 14, height: 14, marginTop: 2, borderRadius: 2, borderWidth: 1.5, borderColor: textOnImage, backgroundColor: checked ? textOnImage : "transparent", alignItems: "center", justifyContent: "center" }}>
        {checked ? <Ionicons name="checkmark" size={10} color={colors.dark} /> : null}
      </View>
      <Text style={{ flex: 1, color: "rgba(255,255,255,0.88)", fontSize: 12, lineHeight: 16, fontWeight: "700" }} selectable>
        {label}
      </Text>
    </Pressable>
  );
}

type SocialButtonProps = {
  label: string;
  icon: "google" | "facebook";
  disabled?: boolean;
  onPress: () => void;
};

function SocialButton({ label, icon, disabled, onPress }: SocialButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 48,
        minWidth: 136,
        borderRadius: 9,
        borderCurve: "continuous",
        backgroundColor: fieldGlass,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 10,
        opacity: disabled ? 0.58 : pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }]
      })}
    >
      <MaterialCommunityIcons name={icon} size={27} color={colors.dark} />
      <Text style={{ color: colors.dark, fontSize: 12, fontWeight: "800" }} selectable>
        {label}
      </Text>
    </Pressable>
  );
}

function showMissingConfig(provider: string, envName: string) {
  Alert.alert("Thiếu cấu hình đăng nhập", `Bạn cần tạo OAuth app cho ${provider}, điền ${envName} trong file .env rồi restart Expo.`);
}
