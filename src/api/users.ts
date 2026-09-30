import { endpoints } from "@/api/endpoints";
import { collectPages } from "@/api/pagination";
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

export const usersApi = {
  all() { return collectPages(page => usersApi.list(page, 100)); },
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
  }
};
