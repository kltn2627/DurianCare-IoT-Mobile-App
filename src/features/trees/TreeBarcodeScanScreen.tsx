import { useCameraPermissions } from "expo-camera";
import axios from "axios";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, ScanLine } from "lucide-react-native";
import { CodeScannerCamera } from "@/src/features/qr-scanner/CodeScannerCamera";
import { resolveTreeCode } from "./treeApi";
import { durianTheme } from "@/src/theme/durianTheme";

export function TreeBarcodeScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);

  async function scan(raw: string) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError(null);
    try {
      const tree = await resolveTreeCode(raw);
      router.replace(`/(main)/trees/${encodeURIComponent(tree.id)}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Không thể tìm cây theo mã này.";
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      setError(status === 403 || /403|forbidden|unauthor|access denied/i.test(message) ? "Bạn không có quyền xem cây này." : status === 404 || /404|not found/i.test(message) ? "Không tìm thấy cây với mã vừa quét." : "Mã cây không hợp lệ hoặc hiện không thể tra cứu.");
      locked.current = false;
    } finally { setBusy(false); }
  }

  return <SafeAreaView style={styles.screen}>
    <View style={styles.top}><Pressable accessibilityLabel="Quay lại" onPress={() => router.back()}><ArrowLeft color={durianTheme.colors.ink} /></Pressable><Text style={styles.title}>Quét mã cây</Text></View>
    {!permission ? <ActivityIndicator color={durianTheme.colors.moss} /> : !permission.granted ? <View style={styles.permission}><Text style={styles.copy}>Cần quyền camera để quét mã vạch cây.</Text><Pressable style={styles.button} onPress={requestPermission}><Text style={styles.buttonText}>Cấp quyền camera</Text></Pressable></View> : <>
      <View style={styles.cameraFrame}><CodeScannerCamera scannerContext="TREE" style={StyleSheet.absoluteFill} onScan={(result) => scan(result.data)} onError={() => setError("Không thể khởi động camera.")} /><View pointerEvents="none" style={styles.scanGuide}><ScanLine color="#fff" size={34} /></View></View>
      <Text style={styles.copy}>Đưa mã vạch CODE128 trên thân cây vào khung quét.</Text>
      {busy ? <View style={styles.busy}><ActivityIndicator color={durianTheme.colors.moss} /><Text>Đang xác thực cây…</Text></View> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {error ? <Pressable style={styles.button} onPress={() => { setError(null); locked.current = false; }}><Text style={styles.buttonText}>Quét lại</Text></Pressable> : null}
    </>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: durianTheme.colors.canvas, padding: 18, gap: 16 }, top: { flexDirection: "row", alignItems: "center", gap: 14 }, title: { color: durianTheme.colors.ink, fontSize: 20, fontWeight: "800" }, cameraFrame: { height: 380, borderRadius: 18, overflow: "hidden", backgroundColor: "#111827", position: "relative" }, scanGuide: { position: "absolute", left: "12%", right: "12%", top: "40%", height: 70, borderColor: "#fff", borderWidth: 2, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#0002" }, copy: { color: durianTheme.colors.muted, fontSize: 14, textAlign: "center" }, permission: { flex: 1, justifyContent: "center", gap: 14 }, button: { backgroundColor: durianTheme.colors.moss, borderRadius: 12, padding: 13, alignItems: "center" }, buttonText: { color: "#fff", fontWeight: "800" }, busy: { flexDirection: "row", justifyContent: "center", gap: 8, alignItems: "center" }, error: { color: "#b91c1c", textAlign: "center", fontWeight: "700" } });
