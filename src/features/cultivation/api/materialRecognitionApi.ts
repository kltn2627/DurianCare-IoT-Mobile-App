import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { authorizedRequest } from "@/src/features/auth/authApi";
import { cultivationError } from "./cultivationError";
import { OcrImagePreparationError, prepareImageForOcr } from "./ocrImage";
import type { MaterialRecognitionResult } from "./materialRecognition";

export async function recognizeMaterialLabel(asset: ImagePicker.ImagePickerAsset): Promise<MaterialRecognitionResult> {
  const image = await prepareImageForOcr(asset);
  const formData = new FormData();
  if (Platform.OS === "web") {
    const file = await (await fetch(image.uri)).blob();
    formData.append("image", file, image.fileName);
  } else {
    formData.append("image", { uri: image.uri, name: image.fileName, type: image.mimeType } as never);
  }
  const response = await authorizedRequest<MaterialRecognitionResult>({
    method: "POST",
    url: "/api/ai/material-recognition/label",
    data: formData,
    headers: { Accept: "application/json" },
    timeout: 90000,
  });
  return response.data;
}

export function materialRecognitionError(error: unknown): string {
  const value = error as { status?: number; code?: string; cause?: { code?: string } } | null;
  if (error instanceof OcrImagePreparationError) return error.message;
  if (value?.code === "OCR_IMAGE_TOO_LARGE") return "Không thể tối ưu ảnh để nhận diện. Hãy thử chụp gần nhãn hơn.";
  if (value?.status === 413) return "Không thể tối ưu ảnh để nhận diện. Hãy thử chụp gần nhãn hơn.";
  if (value?.status === 422) return "Không đọc được chữ trên nhãn. Hãy chụp rõ phần tên và thành phần sản phẩm.";
  if ([value?.code, value?.cause?.code].some(code => code === "ECONNABORTED" || code === "ETIMEDOUT" || code === "ERR_NETWORK")) {
    return "Không thể kết nối dịch vụ nhận diện. Vui lòng thử lại.";
  }
  return cultivationError(error, "Không thể kết nối dịch vụ nhận diện. Vui lòng thử lại.");
}
