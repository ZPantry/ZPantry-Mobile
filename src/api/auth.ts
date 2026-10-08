import { endpoints } from "@/api/endpoints";
import { apiRequest, type ApiMessageResponse } from "@/api/client";

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
};

export type VerifyOtpPayload = {
  email: string;
  otpCode: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthMessageResponse = ApiMessageResponse;
export type ResetPasswordPayload = { email: string; otpCode: string; newPassword: string; confirmPassword: string };

export type LoginResponse = {
  accessToken: string;
  expiresAt: string;
  userId?: string;
  fullName: string;
  email: string;
  refreshToken: string;
  role: string;
};

export type RefreshTokenResponse = Pick<LoginResponse, "accessToken" | "expiresAt" | "refreshToken">;

// A reset-specific verification endpoint must preserve the OTP for reset-password.
// Registration verify-otp confirms email and must not be used for this flow.
const resetOtpVerifyPath = process.env.EXPO_PUBLIC_RESET_OTP_VERIFY_PATH?.trim();
export const authApi = {
  canVerifyPasswordResetOtp: Boolean(resetOtpVerifyPath),
  async verifyPasswordResetOtp(payload: VerifyOtpPayload) {
    if (!/^\d{6}$/.test(payload.otpCode)) throw new Error("Mã OTP phải gồm 6 chữ số.");
    if (!resetOtpVerifyPath) return false;
    await apiRequest<AuthMessageResponse>(resetOtpVerifyPath, { method: "POST", body: JSON.stringify(payload) });
    return true;
  },
  forgotPassword(email: string) {
    return apiRequest<AuthMessageResponse>(endpoints.auth.forgotPassword, {
      method: "POST", body: JSON.stringify({ email: email.trim() })
    });
  },
  resetPassword(payload: ResetPasswordPayload) {
    if (!/^\d{6}$/.test(payload.otpCode) || payload.newPassword.length < 8 || payload.newPassword.length > 200 || payload.newPassword !== payload.confirmPassword)
      throw new Error("Kiểm tra mã OTP và mật khẩu mới (8–200 ký tự), xác nhận phải trùng khớp.");
    return apiRequest<AuthMessageResponse>(endpoints.auth.resetPassword, {
      method: "POST", body: JSON.stringify(payload)
    });
  },
  register(payload: RegisterPayload) {
    return apiRequest<AuthMessageResponse>(endpoints.auth.register, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  verifyOtp(payload: VerifyOtpPayload) {
    return apiRequest<AuthMessageResponse>(endpoints.auth.verifyOtp, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  login(payload: LoginPayload) {
    return apiRequest<LoginResponse>(endpoints.auth.login, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  google(idToken: string) {
    return apiRequest<LoginResponse>(endpoints.auth.google, {
      method: "POST",
      body: JSON.stringify({ idToken })
    });
  },

  refreshToken(refreshToken: string) {
    return apiRequest<RefreshTokenResponse>(endpoints.auth.refreshToken, {
      method: "POST",
      body: JSON.stringify({ refreshToken })
    });
  },

  logout(accessToken?: string) {
    return apiRequest<AuthMessageResponse | null>(endpoints.auth.logout, {
      method: "POST",
      auth: true,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
    });
  }
};
