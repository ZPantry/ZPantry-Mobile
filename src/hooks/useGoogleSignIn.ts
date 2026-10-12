import { Platform } from "react-native";
import { ApiError } from "@/api/response";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

// Native uses Google's SDK. Browser OAuth redirects with Android custom schemes
// are not a substitute for an installed-app Google sign-in configuration.
export function useGoogleSignIn() {
  const ready = Boolean(webClientId && (Platform.OS !== "ios" || iosClientId));
  return {
    ready,
    async getIdToken(): Promise<string | null> {
      if (!ready) throw new ApiError("Đăng nhập Google chưa sẵn sàng trên phiên bản này.", 400);
      try {
        // Lazy loading lets email auth keep working in an older build/Expo Go.
        const { GoogleSignin, statusCodes, isErrorWithCode } = await import("@react-native-google-signin/google-signin");
        GoogleSignin.configure({ webClientId, iosClientId, offlineAccess: false });
        try {
          if (Platform.OS === "android") await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const response = await GoogleSignin.signIn();
          if (response.type === "cancelled") return null;
          if (!response.data.idToken) throw new ApiError("Google chưa trả về thông tin xác thực. Vui lòng thử lại.", 400);
          return response.data.idToken;
        } catch (error) {
          if (isErrorWithCode(error)) {
            if (error.code === 'DEVELOPER_ERROR' || error.code === '10')
              throw new ApiError("Cấu hình Google Android chưa khớp. Kiểm tra package com.zpantry.app, SHA-1 chữ ký và Web Client ID rồi thử lại.", 400);
            if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
            if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
              throw new ApiError("Thiết bị cần Google Play Services để đăng nhập Google.", 400);
            if (error.code === statusCodes.IN_PROGRESS)
              throw new ApiError("Đăng nhập Google đang được xử lý. Vui lòng chờ.", 400);
          }
          throw error;
        }
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError("Chưa đăng nhập được Google. Kiểm tra kết nối hoặc cập nhật ứng dụng rồi thử lại.", 400);
      }
    }
  };
}
