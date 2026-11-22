import { CheckCircle2, KeyRound, Plug, RotateCcw, Wifi } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianTheme } from "@/src/theme/durianTheme";

// Same four steps as the Web page /dashboard/client/devices/setup.
const STEPS = [
  { icon: Plug, title: "Cắm nguồn thiết bị",
    body: "Cắm nguồn 5 V cho trạm cảm biến hoặc camera. Lần đầu (hoặc khi không vào được Wi-Fi đã lưu), thiết bị tự phát Wi-Fi cài đặt." },
  { icon: Wifi, title: "Vào Wi-Fi “DurianCare-Setup-XXXX”",
    body: "Trong Cài đặt Wi-Fi của điện thoại, chọn mạng DurianCare-Setup- kèm 4 ký tự. Trang cài đặt tự mở; nếu không, mở trình duyệt tới http://192.168.4.1." },
  { icon: KeyRound, title: "Nhập Wi-Fi vườn và mã nhận",
    body: "Chọn Wi-Fi 2,4 GHz của vườn, nhập mật khẩu và mã nhận 10 ký tự (ABCDE-12345) đi kèm thiết bị. Để trống “Server URL” trừ khi kỹ thuật viên dặn. Bấm Save: thiết bị khởi động lại." },
  { icon: CheckCircle2, title: "Thiết bị tự xuất hiện",
    body: "Gắn thiết bị vào vườn một lần bằng cùng mã nhận (Khí hậu vườn → “Thêm & gắn thiết bị”). Sau đó thiết bị tự hiện với trạng thái Online; không cần nhập địa chỉ IP." },
];

export function DeviceSetupScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DurianScreenHeader
          eyebrow="THIẾT BỊ IOT"
          icon={Wifi}
          title="Hướng dẫn kết nối thiết bị"
          subtitle="Trạm cảm biến và camera tự tìm máy chủ DurianCare; ảnh và số đo luôn xem qua ứng dụng."
        />
        {STEPS.map((step, index) => (
          <View key={step.title} style={styles.card}>
            <View style={styles.iconBox}><step.icon color={durianTheme.colors.moss} size={20} /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.title}>{index + 1}. {step.title}</Text>
              <Text style={styles.body}>{step.body}</Text>
            </View>
          </View>
        ))}
        <View style={[styles.card, styles.warn]}>
          <View style={styles.iconBox}><RotateCcw color="#92400e" size={20} /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.title, { color: "#92400e" }]}>Đổi Wi-Fi hoặc cài lại từ đầu</Text>
            <Text style={[styles.body, { color: "#92400e" }]}>
              Rút nguồn, giữ nút BOOT (camera: nút IO0 của đế nạp), cắm nguồn lại và giữ tiếp 5 giây. Thiết bị xóa cấu hình
              đã lưu và phát lại Wi-Fi “DurianCare-Setup-XXXX”. Không vào được Wi-Fi sau nhiều lần thử, thiết bị cũng tự phát
              Wi-Fi cài đặt trong 10 phút.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: durianTheme.colors.canvas },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#e8ece7" },
  warn: { backgroundColor: "#fffbeb", borderColor: "#fde68a" },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#eaf4ec" },
  title: { fontSize: 14, fontWeight: "700", color: "#1a2a20" },
  body: { fontSize: 13, lineHeight: 19, color: "#536259" },
});
