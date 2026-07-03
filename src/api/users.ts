import { apiRequest, type ApiMessageResponse, type PaginatedResponse } from "@/api/client";

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  isEmailConfirmed: boolean;
  isActive: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateUserPayload = {
  fullName: string;
  avatarUrl: string;
  password?: string;
};

export const usersApi = {
  list(pageIndex = 1, pageSize = 50) {
    return apiRequest<PaginatedResponse<AdminUser>>(`/api/users?pageIndex=${pageIndex}&pageSize=${pageSize}`, { auth: true });
  },

  get(id: string) {
    return apiRequest<AdminUser>(`/api/users/${id}`, { auth: true });
  },

  update(id: string, payload: UpdateUserPayload) {
    return apiRequest<AdminUser>(`/api/users/${id}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify(payload)
    });
  },

  remove(id: string) {
    return apiRequest<ApiMessageResponse>(`/api/users/${id}`, {
      method: "DELETE",
      auth: true
    });
  }
};
