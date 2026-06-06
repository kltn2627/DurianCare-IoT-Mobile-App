import { ShieldCheck, ShieldX, UserRoundCheck, Users } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianTheme } from "@/src/theme/durianTheme";

type EngineerRequest = {
  id: string;
  name: string;
  area: string;
  expertise: string;
  status: "PENDING" | "APPROVED";
};

const initialRequests: EngineerRequest[] = [
  {
    id: "request-tran-an",
    name: "Kỹ sư Trần An",
    area: "Đăng ký quản lý Khu A",
    expertise: "Bệnh học thực vật • 6 năm kinh nghiệm",
    status: "APPROVED",
  },
  {
    id: "request-le-huong",
    name: "Kỹ sư Lê Hương",
    area: "Đăng ký quản lý Khu B",
    expertise: "Dinh dưỡng cây trồng • 4 năm kinh nghiệm",
    status: "PENDING",
  },
];

export function DurianFarmAuthorizationScreen() {
  const [requests, setRequests] = useState(initialRequests);

  function approve(requestId: string) {
    setRequests((current) =>
      current.map((request) =>
        request.id === requestId ? { ...request, status: "APPROVED" } : request,
      ),
    );
  }

  function revoke(requestId: string) {
    setRequests((current) => current.filter((request) => request.id !== requestId));
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader
        eyebrow="FARM AUTHORIZATION"
        icon={Users}
        title="Ủy quyền phân khu"
        subtitle="Phê duyệt hoặc thu hồi quyền can thiệp của kỹ sư thực địa bằng mock state."
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <UserRoundCheck color={durianTheme.colors.durianYellow} size={24} />
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryValue}>
              {requests.filter((request) => request.status === "APPROVED").length} kỹ sư được cấp quyền
            </Text>
            <Text style={styles.summaryLabel}>Vườn Sầu Riêng An Nhiên • Vụ mùa 2026</Text>
          </View>
        </View>

        {requests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{request.name.charAt(0)}</Text>
              </View>
              <View style={styles.requestCopy}>
                <Text style={styles.name}>{request.name}</Text>
                <Text style={styles.area}>{request.area}</Text>
              </View>
              <View style={[styles.status, request.status === "APPROVED" && styles.statusApproved]}>
                <Text style={styles.statusText}>
                  {request.status === "APPROVED" ? "ĐÃ DUYỆT" : "CHỜ DUYỆT"}
                </Text>
              </View>
            </View>
            <Text style={styles.expertise}>{request.expertise}</Text>
            <View style={styles.actions}>
              {request.status === "PENDING" ? (
                <Pressable onPress={() => approve(request.id)} style={styles.approveButton}>
                  <ShieldCheck color={durianTheme.colors.mossDark} size={18} />
                  <Text style={styles.approveText}>Phê duyệt</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => revoke(request.id)} style={styles.revokeButton}>
                <ShieldX color={durianTheme.colors.danger} size={18} />
                <Text style={styles.revokeText}>Hủy liên kết / Thu hồi quyền</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {requests.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Chưa có kỹ sư liên kết</Text>
            <Text style={styles.emptyText}>Các yêu cầu mới từ Web Client sẽ xuất hiện tại đây.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  approveButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 13,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  approveText: { color: durianTheme.colors.mossDark, fontSize: 11, fontWeight: "900" },
  area: { color: durianTheme.colors.muted, fontSize: 11, marginTop: 3 },
  avatar: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: { color: durianTheme.colors.durianYellow, fontSize: 17, fontWeight: "900" },
  content: { gap: 14, padding: 18, paddingBottom: 42 },
  empty: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderRadius: 20, gap: 5, padding: 28 },
  emptyText: { color: durianTheme.colors.muted, fontSize: 12, textAlign: "center" },
  emptyTitle: { color: durianTheme.colors.ink, fontSize: 16, fontWeight: "900" },
  expertise: { color: durianTheme.colors.ink, fontSize: 12, lineHeight: 18 },
  name: { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900" },
  requestCard: { backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.md, gap: 13, padding: 16 },
  requestCopy: { flex: 1 },
  requestHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  revokeButton: {
    alignItems: "center",
    backgroundColor: "#FBE9E5",
    borderRadius: 13,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  revokeText: { color: durianTheme.colors.danger, fontSize: 11, fontWeight: "900" },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  status: { backgroundColor: durianTheme.colors.mossSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 },
  statusApproved: { backgroundColor: durianTheme.colors.durianYellow },
  statusText: { color: durianTheme.colors.mossDark, fontSize: 8, fontWeight: "900" },
  summary: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: durianTheme.radius.lg,
    flexDirection: "row",
    gap: 12,
    padding: 18,
  },
  summaryCopy: { flex: 1, gap: 4 },
  summaryLabel: { color: durianTheme.colors.mist, fontSize: 11 },
  summaryValue: { color: durianTheme.colors.white, fontSize: 16, fontWeight: "900" },
});
