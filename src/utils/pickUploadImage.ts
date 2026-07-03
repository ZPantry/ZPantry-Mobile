import * as ImagePicker from "expo-image-picker";
import type { UploadFile } from "@/api/recipes";

export type PickedUploadImage = {
  uri: string;
  file: UploadFile;
};

function guessImageType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";
  return "image/jpeg";
}

export async function pickUploadImage(filePrefix: string): Promise<PickedUploadImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Vui lòng cấp quyền truy cập thư viện ảnh để chọn ảnh.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.85
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const fileName = asset.fileName || `${filePrefix}-${Date.now()}.jpg`;
  const webFile = (asset as ImagePicker.ImagePickerAsset & { file?: File }).file;

  return {
    uri: asset.uri,
    file: webFile || {
      uri: asset.uri,
      name: fileName,
      type: asset.mimeType || guessImageType(fileName)
    }
  };
}
