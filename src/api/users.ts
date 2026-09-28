import { endpoints } from "@/api/endpoints";
import { apiRequest, type ApiMessageResponse, type PaginatedResponse } from "@/api/client";

export type AdminUser = {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  isEmailConfirmed: boolean;
  isActive: boolean;
  role: string;
  createdAt: string;
  updatedAt: string | null;
};

export type UpdateUserPayload = {
  fullName?: string | null;
  avatarUrl?: string | null;
  password?: string | null;
};

export type UserProfileResponse = {
  id: string;
  userId: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  goal: string;
  dietPreference: string;
  allergies: string;
};

export type UserProfileUpdateRequest = {
  age: number;
  gender: string;
  height: number;
  weight: number;
  goal?: string;
  dietPreference?: string;
  allergies?: string;
};

export const usersApi = {
  list(pageIndex = 1, pageSize = 10) {
    return apiRequest<PaginatedResponse<AdminUser>>(`${endpoints.users.list}?pageIndex=${pageIndex}&pageSize=${pageSize}`, { auth: true });
  },

  get(id: string) {
    return apiRequest<AdminUser>(endpoints.users.item(id), { auth: true });
  },

  update(id: string, payload: UpdateUserPayload) {
    return apiRequest<AdminUser>(endpoints.users.item(id), {
      method: "PUT",
      auth: true,
      // Only these fields belong to UserUpdateRequest; preserve null/whitespace.
      body: JSON.stringify({ fullName: payload.fullName, avatarUrl: payload.avatarUrl, password: payload.password })
    });
  },

  remove(id: string) {
    return apiRequest<ApiMessageResponse>(endpoints.users.item(id), {
      method: "DELETE",
      auth: true
    });
  },

  getProfile(id: string) {
    return apiRequest<UserProfileResponse>(endpoints.users.profile(id), { auth: true });
  },

  updateProfile(id: string, payload: UserProfileUpdateRequest) {
    return apiRequest<UserProfileResponse>(endpoints.users.profile(id), {
      method: "PUT",
      auth: true,
      body: JSON.stringify(payload)
    });
  }
};
