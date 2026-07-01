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

export type LoginResponse = {
  accessToken: string;
  expiresAt: string;
  userId: string;
  fullName: string;
  email: string;
  refreshToken: string;
  role: string;
};

export type RefreshTokenResponse = Pick<LoginResponse, "accessToken" | "expiresAt" | "refreshToken">;

export const authApi = {
  register(payload: RegisterPayload) {
    return apiRequest<AuthMessageResponse>("/api/Auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  verifyOtp(payload: VerifyOtpPayload) {
    return apiRequest<AuthMessageResponse>("/api/Auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  login(payload: LoginPayload) {
    return apiRequest<LoginResponse>("/api/Auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  refreshToken(refreshToken: string) {
    return apiRequest<RefreshTokenResponse>("/api/Auth/refresh-token", {
      method: "POST",
      body: JSON.stringify({ refreshToken })
    });
  },

  logout(accessToken?: string) {
    return apiRequest<AuthMessageResponse | null>("/api/Auth/logout", {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
    });
  }
};
