import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { ApiError } from "@/api/response";

WebBrowser.maybeCompleteAuthSession();

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const redirectUri = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI?.trim();

export function useGoogleSignIn() {
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    // The hook must always run; the placeholder is never used to open OAuth.
    webClientId: webClientId || "unconfigured",
    ...(redirectUri ? { redirectUri } : {}),
    selectAccount: true
  });
  return {
    ready: Boolean(webClientId && request),
    async getIdToken(): Promise<string | null> {
      if (!webClientId || !request) throw new ApiError("Đăng nhập Google chưa sẵn sàng trên phiên bản này.", 400);
      const result = await promptAsync();
      if (result.type === "cancel" || result.type === "dismiss") return null;
      if (result.type !== "success" || !result.params.id_token)
        throw new ApiError("Chưa xác thực được tài khoản Google. Vui lòng thử lại.", 400);
      return result.params.id_token;
    }
  };
}
