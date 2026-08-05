import { Check, MessageCircle, RefreshCw, Search, Send, UserRound, UserX, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianTheme } from "@/src/theme/durianTheme";
import { connectionApi, type ConnectionUser, type UserConnection } from "./connectionApi";

type TabKey = "COMMUNITY" | "PHONE" | "REQUESTS" | "CONNECTED";

const relationText: Record<ConnectionUser["relationStatus"], string> = {
  NONE: "Chưa kết nối",
  REQUEST_SENT: "Đã gửi lời mời",
  REQUEST_RECEIVED: "Chờ bạn phản hồi",
  CONNECTED: "Đã kết nối",
  BLOCKED: "Đã chặn",
};

export function DurianFarmerCommunity() {
  const [tab, setTab] = useState<TabKey>("COMMUNITY");
  const [query, setQuery] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneResult, setPhoneResult] = useState<ConnectionUser | null>(null);
  const [communityUsers, setCommunityUsers] = useState<ConnectionUser[]>([]);
  const [incoming, setIncoming] = useState<UserConnection[]>([]);
  const [outgoing, setOutgoing] = useState<UserConnection[]>([]);
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const phoneError = useMemo(() => {
    const value = phoneNumber.trim();
    if (!value) return "";
    return /^[0-9+() .-]{8,30}$/.test(value) ? "" : "Số điện thoại chưa đúng định dạng.";
  }, [phoneNumber]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [community, incomingRequests, outgoingRequests, connected] = await Promise.all([
        connectionApi.communityUsers(query),
        connectionApi.incoming(),
        connectionApi.outgoing(),
        connectionApi.connections(),
      ]);
      setCommunityUsers(community.items);
      setIncoming(incomingRequests);
      setOutgoing(outgoingRequests);
      setConnections(connected.items);
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function runAction(id: string, action: () => Promise<unknown>) {
    if (actionId) return;
    setActionId(id);
    setError("");
    try {
      await action();
      await loadAll();
      if (phoneResult && phoneNumber.trim()) {
        setPhoneResult(await connectionApi.searchByPhone(phoneNumber.trim()));
      }
    } catch (actionError) {
      setError(messageOf(actionError));
    } finally {
      setActionId(null);
    }
  }

  async function searchByPhone() {
    if (phoneError || !phoneNumber.trim()) return;
    setLoading(true);
    setError("");
    setPhoneResult(null);
    try {
      setPhoneResult(await connectionApi.searchByPhone(phoneNumber.trim()));
    } catch (searchError) {
      setError(messageOf(searchError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader
        eyebrow="KẾT NỐI DURIANCARE"
        icon={UserRound}
        title="Cộng đồng"
        subtitle="Tìm nông hộ hoặc kỹ sư nông nghiệp bằng dữ liệu thật từ DurianCare."
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tabs}>
          <TabButton active={tab === "COMMUNITY"} label="Cộng đồng" onPress={() => setTab("COMMUNITY")} />
          <TabButton active={tab === "PHONE"} label="Tìm SĐT" onPress={() => setTab("PHONE")} />
          <TabButton active={tab === "REQUESTS"} label={`Lời mời${incoming.length ? ` (${incoming.length})` : ""}`} onPress={() => setTab("REQUESTS")} />
          <TabButton active={tab === "CONNECTED"} label="Đã kết nối" onPress={() => setTab("CONNECTED")} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {tab === "COMMUNITY" ? (
          <View style={styles.section}>
            <View style={styles.searchRow}>
              <TextInput
                onChangeText={setQuery}
                placeholder="Tìm theo tên hoặc khu vực"
                placeholderTextColor={durianTheme.colors.muted}
                style={styles.searchInput}
                value={query}
              />
              <IconButton icon={Search} onPress={() => void loadAll()} />
              <IconButton icon={RefreshCw} onPress={() => void loadAll()} />
            </View>
            {loading ? <ActivityIndicator color={durianTheme.colors.moss} /> : null}
            {!loading && communityUsers.length === 0 ? <EmptyText text="Không có người dùng phù hợp." /> : null}
            {communityUsers.map((user) => (
              <UserCard
                key={user.id}
                actionId={actionId}
                onAccept={(connectionId) => runAction(connectionId, () => connectionApi.accept(connectionId))}
                onConnect={() => runAction(user.id, () => connectionApi.sendRequest(user.id, "COMMUNITY"))}
                user={user}
              />
            ))}
          </View>
        ) : null}

        {tab === "PHONE" ? (
          <View style={styles.section}>
            <View style={styles.searchRow}>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={setPhoneNumber}
                placeholder="0901234567"
                placeholderTextColor={durianTheme.colors.muted}
                style={styles.searchInput}
                value={phoneNumber}
              />
              <IconButton disabled={!!phoneError || !phoneNumber.trim()} icon={Search} onPress={() => void searchByPhone()} />
            </View>
            {phoneError ? <Text style={styles.error}>{phoneError}</Text> : null}
            {loading ? <ActivityIndicator color={durianTheme.colors.moss} /> : null}
            {phoneResult ? (
              <UserCard
                actionId={actionId}
                onAccept={(connectionId) => runAction(connectionId, () => connectionApi.accept(connectionId))}
                onConnect={() => runAction(phoneResult.id, () => connectionApi.sendRequest(phoneResult.id, "PHONE_SEARCH"))}
                user={phoneResult}
              />
            ) : !loading && phoneNumber.trim() && !error ? (
              <EmptyText text="Không tìm thấy người dùng phù hợp." />
            ) : null}
          </View>
        ) : null}

        {tab === "REQUESTS" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lời mời nhận được</Text>
            {incoming.length === 0 ? <EmptyText text="Chưa có lời mời mới." /> : null}
            {incoming.map((item) => (
              <RequestCard key={item.id} connection={item}>
                <ActionButton icon={Check} label="Chấp nhận" onPress={() => runAction(item.id, () => connectionApi.accept(item.id))} />
                <ActionButton danger icon={X} label="Từ chối" onPress={() => runAction(item.id, () => connectionApi.reject(item.id))} />
              </RequestCard>
            ))}
            <Text style={styles.sectionTitle}>Lời mời đã gửi</Text>
            {outgoing.length === 0 ? <EmptyText text="Bạn chưa gửi lời mời nào." /> : null}
            {outgoing.map((item) => (
              <RequestCard key={item.id} connection={item}>
                <ActionButton danger icon={X} label="Hủy" onPress={() => runAction(item.id, () => connectionApi.cancel(item.id))} />
              </RequestCard>
            ))}
          </View>
        ) : null}

        {tab === "CONNECTED" ? (
          <View style={styles.section}>
            {connections.length === 0 ? <EmptyText text="Chưa có kết nối nào." /> : null}
            {connections.map((item) => (
              <RequestCard key={item.id} connection={item}>
                <ActionButton icon={MessageCircle} label="Nhắn tin" onPress={() => undefined} />
                <ActionButton
                  danger
                  icon={UserX}
                  label="Hủy kết nối"
                  onPress={() =>
                    Alert.alert("Hủy kết nối", "Bạn chắc chắn muốn hủy kết nối này?", [
                      { text: "Không", style: "cancel" },
                      { text: "Hủy kết nối", style: "destructive", onPress: () => void runAction(item.id, () => connectionApi.disconnect(item.id)) },
                    ])
                  }
                />
              </RequestCard>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function UserCard({
  user,
  actionId,
  onConnect,
  onAccept,
}: {
  user: ConnectionUser;
  actionId: string | null;
  onConnect: () => void;
  onAccept: (connectionId: string) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.identityRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user.fullName.charAt(0).toUpperCase()}</Text></View>
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{user.fullName}</Text>
          <Text style={styles.meta}>{user.role === "ENGINEER" ? "Kỹ sư" : "Nông hộ"} · {user.region || "Chưa cập nhật khu vực"}</Text>
          {user.phoneNumber ? <Text style={styles.meta}>{user.phoneNumber}</Text> : null}
        </View>
      </View>
      <Text style={styles.badge}>{relationText[user.relationStatus]}</Text>
      <View style={styles.actions}>
        {user.relationStatus === "NONE" ? (
          <ActionButton loading={actionId === user.id} icon={Send} label="Kết nối" onPress={onConnect} />
        ) : null}
        {user.relationStatus === "REQUEST_RECEIVED" && user.connectionId ? (
          <ActionButton loading={actionId === user.connectionId} icon={Check} label="Chấp nhận" onPress={() => onAccept(user.connectionId!)} />
        ) : null}
        {user.relationStatus === "CONNECTED" ? <ActionButton icon={MessageCircle} label="Nhắn tin" onPress={() => undefined} /> : null}
      </View>
    </View>
  );
}

function RequestCard({ connection, children }: { connection: UserConnection; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.identityRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{connection.user.fullName.charAt(0).toUpperCase()}</Text></View>
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{connection.user.fullName}</Text>
          <Text style={styles.meta}>{connection.user.role === "ENGINEER" ? "Kỹ sư" : "Nông hộ"}</Text>
        </View>
      </View>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function IconButton({ disabled, icon: Icon, onPress }: { disabled?: boolean; icon: typeof Search; onPress: () => void }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.iconButton, disabled && styles.disabled]}>
      <Icon color={durianTheme.colors.mossDark} size={18} />
    </Pressable>
  );
}

function ActionButton({
  danger,
  icon: Icon,
  label,
  loading,
  onPress,
}: {
  danger?: boolean;
  icon: typeof Send;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.actionButton, danger && styles.actionDanger]}>
      {loading ? <ActivityIndicator color={durianTheme.colors.mossDark} size="small" /> : <Icon color={danger ? durianTheme.colors.danger : durianTheme.colors.mossDark} size={16} />}
      <Text style={[styles.actionButtonText, danger && styles.actionDangerText]}>{label}</Text>
    </Pressable>
  );
}

function EmptyText({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Không thể tải dữ liệu kết nối.";
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  actionButtonText: { color: durianTheme.colors.mossDark, fontSize: 12, fontWeight: "900" },
  actionDanger: { backgroundColor: "#FDECEC" },
  actionDangerText: { color: durianTheme.colors.danger },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  avatar: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: { color: durianTheme.colors.durianYellow, fontSize: 18, fontWeight: "900" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 999,
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  card: { backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.md, padding: 14 },
  content: { gap: 14, padding: 18, paddingBottom: 40 },
  disabled: { opacity: 0.5 },
  empty: { color: durianTheme.colors.muted, fontSize: 13, fontWeight: "800", paddingVertical: 12, textAlign: "center" },
  error: { backgroundColor: "#FDECEC", borderRadius: 12, color: durianTheme.colors.danger, fontSize: 12, fontWeight: "800", padding: 12 },
  iconButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  identityCopy: { flex: 1, gap: 3 },
  identityRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  meta: { color: durianTheme.colors.muted, fontSize: 11, fontWeight: "700" },
  name: { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900" },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  searchInput: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 14,
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 13,
    paddingHorizontal: 12,
  },
  searchRow: { flexDirection: "row", gap: 8 },
  section: { gap: 12 },
  sectionTitle: { color: durianTheme.colors.ink, fontSize: 15, fontWeight: "900", marginTop: 8 },
  tab: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderRadius: 12, flex: 1, minHeight: 42, justifyContent: "center", paddingHorizontal: 6 },
  tabActive: { backgroundColor: durianTheme.colors.moss },
  tabText: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "900", textAlign: "center" },
  tabTextActive: { color: durianTheme.colors.durianYellow },
  tabs: { flexDirection: "row", gap: 7 },
});
