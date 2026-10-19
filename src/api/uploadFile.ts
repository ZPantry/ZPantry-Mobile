import { File as ExpoFile } from "expo-file-system";
import { ApiError } from "@/api/response";
import type { UploadFile } from "@/api/recipes";

// expo/fetch serializes Blob/File bytes, not React Native's { uri, name, type }
// descriptors. A TypeScript cast to Blob does not convert a descriptor at runtime.
export function appendUploadFile(form: FormData, field: string, file: UploadFile) {
  if (typeof File !== "undefined" && file instanceof File) {
    form.append(field, file);
    return;
  }
  const upload = file as Extract<UploadFile, { uri: string }>;
  try {
    const localFile = new ExpoFile(upload.uri);
    if (!localFile.exists) throw new ApiError("Không tìm thấy ảnh đã chọn. Hãy chọn lại ảnh.", 400);
    // Expo's multipart encoder supports file-backed parts exposing bytes().
    // Do not call File.slice(): it creates an ArrayBuffer-backed RN Blob, which
    // Android rejects. Preserve metadata without copying into that Blob class.
    const part = {
      name: upload.name || localFile.name || "image.jpg",
      type: upload.type || localFile.type || "application/octet-stream",
      async bytes() {
        try { return await localFile.bytes(); }
        catch { throw new ApiError("Không đọc được ảnh đã chọn. Hãy chọn lại ảnh rồi thử lại.", 400); }
      }
    };
    // RN's DOM typing only accepts Blob; Expo's encoder also accepts bytes parts.
    form.append(field, part as unknown as Blob);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Không chuẩn bị được ảnh đã chọn. Hãy chọn lại ảnh rồi thử lại.", 400);
  }
}
