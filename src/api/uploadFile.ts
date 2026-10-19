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
  const localFile = new ExpoFile(upload.uri);
  if (!localFile.exists) throw new ApiError("Không tìm thấy ảnh đã chọn. Hãy chọn lại ảnh.", 400);
  // Materialize a Blob so Expo's FormData also honors our filename and MIME.
  // Expo File implements Blob but is not an instanceof the global Blob class.
  const blob = localFile.slice(0, localFile.size, upload.type || localFile.type || "application/octet-stream");
  form.append(field, blob, upload.name || "image.jpg");
}
