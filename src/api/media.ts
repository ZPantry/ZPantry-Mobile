import { apiRequest } from "@/api/client";
import type { UploadFile } from "@/api/recipes";

// Upload first, then include the returned URL in one JSON catalog mutation.
// This keeps allergen arrays (including []) intact; ingredient multipart omits them.
export async function withUploadedImage<T extends { imageFile?: UploadFile | null; imageUrl: string | null }>(payload: T) {
  const { imageFile, ...body } = payload;
  if (!imageFile) return body;
  const form = new FormData();
  form.append("file", imageFile as Blob);
  const imageUrl = await apiRequest<string>("/api/media/upload", { method: "POST", auth: true, body: form });
  return { ...body, imageUrl };
}
