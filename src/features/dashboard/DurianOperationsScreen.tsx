import {
  BellRing,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileChartColumn,
  LogOut,
  MessageCircle,
  ShieldCheck,
  ShieldX,
  Send,
  Stethoscope,
  ThermometerSun,
  Users,
  Wifi,
} from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/src/session/SessionContext";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { durianTheme } from "@/src/theme/durianTheme";

export function DurianOperationsScreen() {
  const navigation = useDurianSafeNavigation();
  const { logout, session } = useSession();
  const isOwner = session?.user.role === "OWNER";
  const [engineers, setEngineers] = useState([
    { id: "eng-01", name: "Kỹ sư Trần An", status: "APPROVED" as const },
    { id: "eng-02", name: "Kỹ sư Lê Hương", status: "PENDING" as const },
  ]);

  async function handleLogout() {
    await logout();
  }

  function showStatusAction(message: string) {
    Alert.alert("Đã cập nhật trạng thái", message);
  }

  function inviteEngineer() {
    const id = `eng-${Date.now()}`;
    setEngineers((current) => [
      ...current,
      { id, name: "Kỹ sư mới được mời", status: "PENDING" },
    ]);
  }

  function approveEngineer(engineerId: string) {
    setEngineers((current) =>
      current.map((engineer) =>
        engineer.id === engineerId
          ? { ...engineer, status: "APPROVED" as const }
          : engineer,
      ),
    );
  }

  function revokeEngineer(engineerId: string) {
    setEngineers((current) =>
      current.filter((engineer) => engineer.id !== engineerId),
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {isOwner ? "OWNER" : "ENGINEER"}
              </Text>
            </View>
            <Pressable hitSlop={12} onPress={handleLogout}>
              <LogOut color={durianTheme.colors.mist} size={22} />
            </Pressable>
          </View>

          <Text style={styles.greeting}>Xin chào, {session?.user.name}</Text>

          <Text style={styles.heroCopy}>
            {isOwner
              ? "Theo dõi sức khỏe vườn, cộng tác với kỹ sư và nhận cảnh báo tại một nơi."
              : "Tiếp nhận ca bệnh, trao đổi thực địa và xây dựng phác đồ số cho nhà vườn."}
          </Text>

          <View style={styles.connection}>
            <Wifi color={durianTheme.colors.durianYellow} size={16} />
            <Text style={styles.connectionText}>
              Mock workspace • Không kết nối microservice
            </Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <StatCard
            label={isOwner ? "Khu canh tác" : "Ca đang phụ trách"}
            value={isOwner ? "04" : "07"}
          />
          <StatCard label="Cảnh báo mở" value="03" warning />
          <StatCard label="Phác đồ hoạt động" value="05" />
        </View>

        <Text style={styles.sectionTitle}>Công việc ưu tiên</Text>

        <ActionCard
          description="Đọc cẩm nang VietGAP, bệnh lá và dinh dưỡng dành cho vườn sầu riêng."
          icon={BookOpen}
          label="Không gian tri thức"
          onPress={() => navigation.push("/(main)/knowledge")}
        />
        <ActionCard
          description="Trao đổi kinh nghiệm và tình trạng vườn với mạng lưới nhà nông."
          icon={Users}
          label="Cộng đồng DurianCare"
          onPress={() => navigation.push("/(main)/community")}
        />
        {isOwner ? (
          <>
            <ActionCard
              description="Mời kỹ sư tham gia Khu A bằng mã cộng tác nội bộ."
              icon={Send}
              label="Gửi lời mời hợp tác"
              onPress={inviteEngineer}
            />

            <ActionCard
              description="Xem yêu cầu đăng ký, phê duyệt và thu hồi quyền can thiệp."
              icon={ShieldCheck}
              label="Quản lý ủy quyền kỹ sư"
              onPress={() => navigation.push("/(main)/authorization")}
            />

            <ActionCard
              description="Theo dõi nhiệt độ và độ ẩm đất theo từng mốc giờ."
              icon={FileChartColumn}
              label="Mở báo cáo cảm biến IoT"
              onPress={() => navigation.push("/(main)/sensors")}
            />

            <ActionCard
              description="Lên lịch rải phân, xịt thuốc, liều lượng và ghi chú thực địa."
              icon={CalendarDays}
              label="Mở lịch canh tác"
              onPress={() => navigation.push("/(main)/calendar")}
            />
          </>
        ) : (
          <>
            <ActionCard
              description="Ca Cháy lá tại Khu A cần phác đồ trước 16:00 hôm nay."
              icon={Stethoscope}
              label="Lên phác đồ điều trị"
              onPress={() => navigation.push("/(main)/chat")}
            />

            <ActionCard
              description="Ba ảnh mới từ Chủ vườn Nguyễn Minh đang chờ đánh giá."
              icon={MessageCircle}
              label="Trao đổi với chủ vườn"
              onPress={() => navigation.push("/(main)/chat")}
            />

            <ActionCard
              description="Kiểm tra lại tiến độ Ngày 2 của phác đồ Đốm rong."
              icon={CheckCircle2}
              label="Theo dõi thực địa"
              onPress={() => showStatusAction("Đã đánh dấu lịch kiểm tra thực địa.")}
            />

            <ActionCard
              description="Tạo lịch canh tác và cập nhật trạng thái công việc cho nhà vườn."
              icon={CalendarDays}
              label="Mở lịch canh tác"
              onPress={() => navigation.push("/(main)/calendar")}
            />
          </>
        )}

        {isOwner ? (
          <>
            <Text style={styles.sectionTitle}>Báo cáo cảm biến IoT</Text>

            <View style={styles.sensorGrid}>
              <SensorCard
                label="Nhiệt độ"
                value="29.4°C"
                icon={ThermometerSun}
              />
              <SensorCard
                label="Độ ẩm đất"
                value="63%"
                icon={FileChartColumn}
                warning
              />
              <SensorCard label="Thiết bị online" value="8/9" icon={Wifi} />
            </View>

            <Text style={styles.sectionTitle}>Quyền kỹ sư thực địa</Text>

            {engineers.map((engineer) => (
              <View key={engineer.id} style={styles.engineerCard}>
                <View style={styles.engineerAvatar}>
                  <Users color={durianTheme.colors.moss} size={20} />
                </View>

                <View style={styles.engineerCopy}>
                  <Text style={styles.engineerName}>{engineer.name}</Text>
                  <Text style={styles.engineerStatus}>
                    {engineer.status === "APPROVED"
                      ? "Đã được cấp quyền quản lý"
                      : "Đang chờ phê duyệt"}
                  </Text>
                </View>

                {engineer.status === "PENDING" ? (
                  <Pressable
                    onPress={() => approveEngineer(engineer.id)}
                    style={styles.approveButton}
                  >
                    <ShieldCheck
                      color={durianTheme.colors.mossDark}
                      size={18}
                    />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => revokeEngineer(engineer.id)}
                    style={styles.revokeButton}
                  >
                    <ShieldX color={durianTheme.colors.danger} size={18} />
                  </Pressable>
                )}
              </View>
            ))}
          </>
        ) : null}

        <View style={styles.alertCard}>
          <BellRing color={durianTheme.colors.danger} size={22} />
          <View style={styles.alertCopy}>
            <Text style={styles.alertTitle}>Cảnh báo mới tại Khu A</Text>
            <Text style={styles.alertText}>
              AI ghi nhận dấu hiệu Cháy lá với độ tin cậy 91%.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SensorCard({
  icon: Icon,
  label,
  value,
  warning = false,
}: {
  icon: typeof Wifi;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <View style={styles.sensorCard}>
      <Icon
        color={warning ? durianTheme.colors.warning : durianTheme.colors.moss}
        size={20}
      />
      <Text style={styles.sensorValue}>{value}</Text>
      <Text style={styles.sensorLabel}>{label}</Text>
    </View>
  );
}

type ActionCardProps = {
  description: string;
  icon: typeof Send;
  label: string;
  onPress: () => void;
};

function ActionCard({
  description,
  icon: Icon,
  label,
  onPress,
}: ActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
    >
      <View style={styles.actionIcon}>
        <Icon color={durianTheme.colors.moss} size={22} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

function StatCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, warning && styles.warningValue]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: durianTheme.radius.md,
    flexDirection: "row",
    gap: 13,
    padding: 16,
  },
  actionCopy: { flex: 1, gap: 4 },
  actionDescription: {
    color: durianTheme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  actionLabel: {
    color: durianTheme.colors.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  alertCard: {
    alignItems: "center",
    backgroundColor: "#FBE9E5",
    borderRadius: durianTheme.radius.md,
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    padding: 16,
  },
  alertCopy: { flex: 1, gap: 3 },
  alertText: { color: durianTheme.colors.muted, fontSize: 12, lineHeight: 18 },
  alertTitle: {
    color: durianTheme.colors.danger,
    fontSize: 14,
    fontWeight: "900",
  },
  approveButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  connection: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 6,
  },
  connectionText: {
    color: durianTheme.colors.mist,
    fontSize: 11,
    fontWeight: "700",
  },
  content: { gap: 13, padding: 20, paddingBottom: 42 },
  engineerAvatar: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  engineerCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: durianTheme.radius.md,
    flexDirection: "row",
    gap: 11,
    padding: 14,
  },
  engineerCopy: { flex: 1, gap: 3 },
  engineerName: {
    color: durianTheme.colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  engineerStatus: { color: durianTheme.colors.muted, fontSize: 11 },
  greeting: {
    color: durianTheme.colors.white,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  hero: {
    backgroundColor: durianTheme.colors.moss,
    borderRadius: durianTheme.radius.lg,
    gap: 9,
    padding: 22,
  },
  heroCopy: { color: durianTheme.colors.mist, fontSize: 14, lineHeight: 21 },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  roleBadge: {
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  roleBadgeText: {
    color: durianTheme.colors.mossDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  revokeButton: {
    alignItems: "center",
    backgroundColor: "#FBE9E5",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  sensorCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 16,
    flex: 1,
    gap: 4,
    padding: 13,
  },
  sensorGrid: { flexDirection: "row", gap: 9 },
  sensorLabel: {
    color: durianTheme.colors.muted,
    fontSize: 9,
    textAlign: "center",
  },
  sensorValue: {
    color: durianTheme.colors.ink,
    fontSize: 16,
    fontWeight: "900",
  },
  sectionTitle: {
    color: durianTheme.colors.ink,
    fontSize: 19,
    fontWeight: "900",
    marginTop: 7,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 16,
    flex: 1,
    gap: 3,
    justifyContent: "center",
    minHeight: 100,
    padding: 9,
  },
  statLabel: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
  },
  statRow: { flexDirection: "row", gap: 9 },
  statValue: {
    color: durianTheme.colors.moss,
    fontSize: 23,
    fontWeight: "900",
  },
  warningValue: { color: durianTheme.colors.danger },
});
