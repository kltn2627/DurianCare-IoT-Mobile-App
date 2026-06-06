import { CalendarDays, MapPin, QrCode as QrCodeIcon, Sprout, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

const seasons = [
  {
    cropId: "DC-KA-2026-001",
    name: "Vụ Monthong 2026 - Khu A",
    period: "Tháng 01/2026 - Tháng 07/2026",
    status: "Đang chăm sóc",
  },
  {
    cropId: "DC-KB-2025-004",
    name: "Vụ Ri6 2025 - Khu B",
    period: "Tháng 02/2025 - Tháng 08/2025",
    status: "Đã thu hoạch",
  },
];

export function DurianTraceabilityScreen() {
  const { session } = useSession();
  const [selectedCrop, setSelectedCrop] = useState<(typeof seasons)[number] | null>(null);
  const qrValue = selectedCrop
    ? `https://web.duriancare.local/traceability/${selectedCrop.cropId}`
    : "";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader
        eyebrow="HỒ SƠ & TRUY XUẤT"
        icon={Sprout}
        title="Định danh vụ mùa"
        subtitle="Quản lý hồ sơ và tạo QR mock cho thương lái kiểm tra thông tin công khai."
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.monogram}>
            <Text style={styles.monogramText}>{session?.user.role === "OWNER" ? "NM" : "TA"}</Text>
          </View>
          <Text style={styles.name}>{session?.user.name}</Text>
          <Text style={styles.email}>{session?.user.email}</Text>
          <View style={styles.locationRow}>
            <MapPin color={durianTheme.colors.durianYellow} size={16} />
            <Text style={styles.location}>Krông Pắc, Đắk Lắk</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Danh sách vụ mùa</Text>
        {seasons.map((season) => (
          <View key={season.cropId} style={styles.seasonCard}>
            <View style={styles.seasonTop}>
              <View style={styles.seasonIcon}>
                <CalendarDays color={durianTheme.colors.moss} size={21} />
              </View>
              <View style={styles.seasonCopy}>
                <Text style={styles.seasonName}>{season.name}</Text>
                <Text style={styles.seasonPeriod}>{season.period}</Text>
              </View>
            </View>
            <View style={styles.seasonMeta}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{season.status}</Text>
              </View>
              <Text style={styles.cropId}>{season.cropId}</Text>
            </View>
            <Pressable onPress={() => setSelectedCrop(season)} style={styles.qrButton}>
              <QrCodeIcon color={durianTheme.colors.mossDark} size={19} />
              <Text style={styles.qrButtonText}>Xuất mã QR định danh nông sản</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedCrop(null)}
        transparent
        visible={selectedCrop !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.qrModal}>
            <Pressable hitSlop={12} onPress={() => setSelectedCrop(null)} style={styles.closeButton}>
              <X color={durianTheme.colors.ink} size={22} />
            </Pressable>
            <View style={styles.qrIcon}>
              <QrCodeIcon color={durianTheme.colors.durianYellow} size={26} />
            </View>
            <Text style={styles.qrTitle}>QR định danh vụ mùa</Text>
            <Text style={styles.qrSubtitle}>{selectedCrop?.name}</Text>
            <View style={styles.qrCanvas}>
              {selectedCrop ? (
                <QRCode
                  backgroundColor={durianTheme.colors.white}
                  color={durianTheme.colors.mossDark}
                  size={210}
                  value={qrValue}
                />
              ) : null}
            </View>
            <Text numberOfLines={2} style={styles.qrValue}>{qrValue}</Text>
            <Text style={styles.qrNote}>
              Liên kết mock mở trang Web Client công khai theo mẫu /traceability/[cropId].
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  closeButton: { position: "absolute", right: 17, top: 17, zIndex: 2 },
  content: { gap: 14, padding: 18, paddingBottom: 40 },
  cropId: { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "700" },
  email: { color: durianTheme.colors.mist, fontSize: 12 },
  location: { color: durianTheme.colors.mist, fontSize: 13, fontWeight: "700" },
  locationRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(20, 38, 29, 0.72)",
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  monogram: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  monogramText: { color: durianTheme.colors.mossDark, fontSize: 23, fontWeight: "900" },
  name: { color: durianTheme.colors.white, fontSize: 21, fontWeight: "900", textAlign: "center" },
  profileCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: durianTheme.radius.lg,
    gap: 8,
    padding: durianTheme.spacing.xl,
  },
  qrButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 13,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 13,
  },
  qrButtonText: { color: durianTheme.colors.mossDark, fontSize: 12, fontWeight: "900" },
  qrCanvas: { backgroundColor: durianTheme.colors.white, borderRadius: 18, padding: 16 },
  qrIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 23,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  qrModal: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: durianTheme.radius.lg,
    gap: 10,
    maxWidth: 380,
    padding: 24,
    width: "100%",
  },
  qrNote: { color: durianTheme.colors.muted, fontSize: 11, lineHeight: 17, textAlign: "center" },
  qrSubtitle: { color: durianTheme.colors.muted, fontSize: 12, textAlign: "center" },
  qrTitle: { color: durianTheme.colors.ink, fontSize: 20, fontWeight: "900" },
  qrValue: { color: durianTheme.colors.moss, fontSize: 9, lineHeight: 13, textAlign: "center" },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  seasonCard: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: durianTheme.radius.md,
    gap: 13,
    padding: 16,
  },
  seasonCopy: { flex: 1, gap: 4 },
  seasonIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  seasonMeta: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  seasonName: { color: durianTheme.colors.ink, fontSize: 15, fontWeight: "900" },
  seasonPeriod: { color: durianTheme.colors.muted, fontSize: 11 },
  seasonTop: { alignItems: "center", flexDirection: "row", gap: 11 },
  sectionTitle: { color: durianTheme.colors.ink, fontSize: 19, fontWeight: "900", marginTop: 5 },
  statusBadge: {
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusText: { color: durianTheme.colors.moss, fontSize: 10, fontWeight: "900" },
});
