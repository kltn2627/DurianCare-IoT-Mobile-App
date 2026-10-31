import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { fallbackOcrCompression, needsFallbackCompression, ocrUploadMetadata, primaryOcrCompression, resizeForMaximumDimension } from "./ocrImagePlan";

export type PreparedOcrImage = {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
  fileName: "material-label.jpg";
  mimeType: "image/jpeg";
};

export class OcrImagePreparationError extends Error {
  readonly code = "OCR_IMAGE_TOO_LARGE";
  constructor() {
    super("Không thể tối ưu ảnh để nhận diện. Hãy thử chụp gần nhãn hơn.");
    this.name = "OcrImagePreparationError";
  }
}

async function localFileSize(uri: string): Promise<number | undefined> {
  try {
    if (Platform.OS === "web") return (await (await fetch(uri)).blob()).size;
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && !info.isDirectory ? info.size : undefined;
  } catch {
    return undefined;
  }
}

function logImage(stage: "original" | "processed", image: { width: number; height: number; fileSize?: number; mimeType?: string }) {
  if (__DEV__) console.info("[OCR_IMAGE]", stage, {
    width: image.width,
    height: image.height,
    fileSize: image.fileSize,
    mime: image.mimeType,
  });
}

async function compressImage(
  uri: string,
  width: number,
  height: number,
  plan: { maxDimension: number; quality: number },
) {
  const resize = resizeForMaximumDimension(width, height, plan.maxDimension);
  return ImageManipulator.manipulateAsync(
    uri,
    resize ? [{ resize }] : [],
    { compress: plan.quality, format: ImageManipulator.SaveFormat.JPEG },
  );
}

/** Produces a normalized, orientation-corrected JPEG suitable for the OCR upload limit. */
export async function prepareImageForOcr(asset: ImagePicker.ImagePickerAsset): Promise<PreparedOcrImage> {
  const originalSize = asset.fileSize ?? await localFileSize(asset.uri);
  logImage("original", { width: asset.width, height: asset.height, fileSize: originalSize, mimeType: asset.mimeType });

  let processed = await compressImage(asset.uri, asset.width, asset.height, primaryOcrCompression);
  let processedSize = await localFileSize(processed.uri);
  if (needsFallbackCompression(processedSize)) {
    processed = await compressImage(processed.uri, processed.width, processed.height, fallbackOcrCompression);
    processedSize = await localFileSize(processed.uri);
  }
  logImage("processed", { width: processed.width, height: processed.height, fileSize: processedSize, mimeType: "image/jpeg" });
  if (needsFallbackCompression(processedSize)) throw new OcrImagePreparationError();
  return {
    uri: processed.uri,
    width: processed.width,
    height: processed.height,
    fileSize: processedSize,
    ...ocrUploadMetadata,
  };
}
