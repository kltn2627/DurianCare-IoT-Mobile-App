import { CameraView, type BarcodeScanningResult, type BarcodeType } from "expo-camera";
import type { StyleProp, ViewStyle } from "react-native";

const materialTypes: BarcodeType[] = ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "code93", "itf14", "codabar"];

export function CodeScannerCamera({ style, materialCodes = false, scannerContext, onScan, onError }: {
  style?: StyleProp<ViewStyle>;
  materialCodes?: boolean;
  scannerContext?: "TREE" | "MATERIAL" | "QR";
  onScan: (result: BarcodeScanningResult) => void;
  onError?: () => void;
}) {
  return <CameraView style={style} facing="back"
    barcodeScannerSettings={{ barcodeTypes: scannerContext === "TREE" ? ["code128"] : materialCodes || scannerContext === "MATERIAL" ? materialTypes : ["qr"] }}
    onBarcodeScanned={onScan} onMountError={onError} />;
}
