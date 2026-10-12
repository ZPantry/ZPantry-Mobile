import { apiRequest } from "@/api/client";
import { endpoints } from "@/api/endpoints";
import type { UploadFile } from "@/api/recipes";

// Upload first, then include the returned URL in one JSON catalog mutation.
// This keeps allergen arrays (including []) intact; ingredient multipart omits them.
export async function withUploadedImage<T extends { imageFile?: UploadFile | null; imageUrl: string | null }>(payload: T) {
  const { imageFile, ...body } = payload;
  if (!imageFile) return body;
  const form = new FormData();
  form.append("file", imageFile as Blob);
  const imageUrl = await apiRequest<string>(endpoints.media.upload, { method: "POST", auth: true, body: form });
  return { ...body, imageUrl };
}
export const mediaApi = {
  remove(publicId: string) {
    if (!publicId.trim()) throw new Error("Thiếu mã ảnh cần xóa.");
    return apiRequest(endpoints.media.remove + "?" + new URLSearchParams({ publicId }), { method: "DELETE", auth: true });
  }
};
