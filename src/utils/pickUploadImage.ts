import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import type { UploadFile } from "@/api/recipes";

export type PickedUploadImage = {
  uri: string;
  file: UploadFile;
  size?: number;
  mimeType?: string;
};

function guessImageType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";
  return "image/jpeg";
}

export async function pickUploadImage(filePrefix: string, allowsEditing = true): Promise<PickedUploadImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Vui lòng cấp quyền truy cập thư viện ảnh để chọn ảnh.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing,
    aspect: [4, 3],
    // Native pickers re-encode JPEG where supported, keeping OCR uploads smaller.
    quality: 0.8
  });

  return toUploadImage(result, filePrefix);
}

export async function captureUploadImage(filePrefix: string): Promise<PickedUploadImage | null> {
  // Web must open the picker directly from the button's user activation.
  if (Platform.OS !== "web") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error(permission.canAskAgain
        ? "Vui lòng cấp quyền camera để chụp ảnh."
        : "Quyền camera đã bị tắt. Hãy mở Cài đặt ứng dụng để cho phép camera, hoặc chọn ảnh từ thư viện.");
    }
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    cameraType: ImagePicker.CameraType.back,
    allowsEditing: false,
    quality: 0.8
  });
  return toUploadImage(result, filePrefix);
}

function toUploadImage(result: ImagePicker.ImagePickerResult, filePrefix: string): PickedUploadImage | null {
  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const fileName = asset.fileName || `${filePrefix}-${Date.now()}.jpg`;
  const webFile = (asset as ImagePicker.ImagePickerAsset & { file?: File }).file;

  return {
    uri: asset.uri,
    size: webFile?.size ?? asset.fileSize,
    mimeType: webFile?.type || asset.mimeType || guessImageType(fileName),
    file: webFile || {
      uri: asset.uri,
      name: fileName,
      type: asset.mimeType || guessImageType(fileName)
    }
  };
}
