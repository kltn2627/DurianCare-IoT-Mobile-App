import {
  Check,
  Link2,
  RefreshCw,
  Search,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianTheme } from "@/src/theme/durianTheme";

import {
  acceptConnectionRequest,
  browseCommunityUsers,
  cancelConnectionRequest,
  disconnectUser,
  fetchConnections,
  fetchIncomingRequests,
  rejectConnectionRequest,
  searchUserByPhone,
  sendConnectionRequest,
  type ConnectionUserSummary,
  type UserConnectionResponse,
} from "./connectionsApi";

type TabKey = "browse" | "requests" | "connected";

export function ConnectionsScreen() {
  const [tab, setTab] = useState<TabKey>("browse");
  const [browseUsers, setBrowseUsers] = useState<ConnectionUserSummary[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<UserConnectionResponse[]>([]);
  const [connections, setConnections] = useState<UserConnectionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [phoneResult, setPhoneResult] = useState<ConnectionUserSummary | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadTab = useCallback(
    async (activeTab: TabKey) => {
      setLoading(true);
      try {
        if (activeTab === "browse") {
          const page = await browseCommunityUsers(searchQuery || undefined);
          setBrowseUsers(page.content);
        } else if (activeTab === "requests") {
          const list = await fetchIncomingRequests();
          setIncomingRequests(list);
        } else {
          const page = await fetchConnections();
          setConnections(page.content);
        }
      } catch {
        // leave stale data; errors surfaced by empty state
      } finally {
        setLoading(false);
      }
    },
    [searchQuery],
  );

  useEffect(() => {
    loadTab(tab);
  }, [tab, loadTab]);

  async function handlePhoneSearch() {
    if (!phoneQuery.trim()) return;
    setPhoneError(null);
    setPhoneResult(null);
    try {
      const result = await searchUserByPhone(phoneQuery.trim());
      setPhoneResult(result);
    } catch {
      setPhoneError("Không tìm thấy người dùng với số điện thoại này.");
    }
  }

  async function handleSendRequest(userId: string) {
    setActionLoading(userId);
    try {
      await sendConnectionRequest(userId);
      loadTab(tab);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAccept(connectionId: string) {
    setActionLoading(connectionId);
    try {
      await acceptConnectionRequest(connectionId);
      const list = await fetchIncomingRequests();
      setIncomingRequests(list);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(connectionId: string) {
    setActionLoading(connectionId);
    try {
      await rejectConnectionRequest(connectionId);
      const list = await fetchIncomingRequests();
      setIncomingRequests(list);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(connectionId: string) {
    setActionLoading(connectionId);
    try {
      await cancelConnectionRequest(connectionId);
      loadTab(tab);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDisconnect(connectionId: string) {
    setActionLoading(connectionId);
    try {
      await disconnectUser(connectionId);
      const page = await fetchConnections();
      setConnections(page.content);
    } finally {
      setActionLoading(null);
    }
  }

  function renderBrowseItem({ item }: { item: ConnectionUserSummary }) {
    const busy = actionLoading === item.id;
    return (
      <View style={styles.userCard}>
        <View style={styles.userAvatar}>
          <Text style={styles.avatarText}>{(item.fullName ?? "?").charAt(0)}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.fullName}</Text>
          {item.role ? <Text style={styles.userRole}>{item.role}</Text> : null}
          {item.region ? <Text style={styles.userMeta}>{item.region}</Text> : null}
        </View>
        {item.relationStatus === "NONE" ? (
          <Pressable
            disabled={busy}
            hitSlop={8}
            onPress={() => handleSendRequest(item.id)}
            style={({ pressed }) => [styles.actionBtn, styles.primaryBtn, pressed && styles.pressed]}
          >
            {busy ? (
              <ActivityIndicator color={durianTheme.colors.mossDark} size="small" />
            ) : (
              <UserPlus color={durianTheme.colors.mossDark} size={18} />
            )}
          </Pressable>
        ) : item.relationStatus === "REQUEST_SENT" && item.connectionId ? (
          <Pressable
            disabled={busy}
            hitSlop={8}
            onPress={() => handleCancel(item.connectionId!)}
            style={({ pressed }) => [styles.actionBtn, styles.mutedBtn, pressed && styles.pressed]}
          >
            <X color={durianTheme.colors.muted} size={18} />
          </Pressable>
        ) : item.relationStatus === "CONNECTED" ? (
          <View style={styles.connectedBadge}>
            <Link2 color={durianTheme.colors.moss} size={16} />
            <Text style={styles.connectedText}>Đã kết nối</Text>
          </View>
        ) : null}
      </View>
    );
  }

  function renderRequestItem({ item }: { item: UserConnectionResponse }) {
    const busy = actionLoading === item.id;
    return (
      <View style={styles.userCard}>
        <View style={styles.userAvatar}>
          <Text style={styles.avatarText}>
            {(item.user?.fullName ?? "?").charAt(0)}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.user?.fullName}</Text>
          {item.requesterRole ? (
            <Text style={styles.userRole}>{item.requesterRole}</Text>
          ) : null}
        </View>
        <View style={styles.requestActions}>
          <Pressable
            disabled={busy}
            hitSlop={8}
            onPress={() => handleAccept(item.id)}
            style={({ pressed }) => [styles.actionBtn, styles.primaryBtn, pressed && styles.pressed]}
          >
            {busy ? (
              <ActivityIndicator color={durianTheme.colors.mossDark} size="small" />
            ) : (
              <Check color={durianTheme.colors.mossDark} size={18} />
            )}
          </Pressable>
          <Pressable
            disabled={busy}
            hitSlop={8}
            onPress={() => handleReject(item.id)}
            style={({ pressed }) => [styles.actionBtn, styles.dangerBtn, pressed && styles.pressed]}
          >
            <X color={durianTheme.colors.danger} size={18} />
          </Pressable>
        </View>
      </View>
    );
  }

  function renderConnectionItem({ item }: { item: UserConnectionResponse }) {
    const busy = actionLoading === item.id;
    return (
      <View style={styles.userCard}>
        <View style={styles.userAvatar}>
          <Text style={styles.avatarText}>
            {(item.user?.fullName ?? "?").charAt(0)}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.user?.fullName}</Text>
          {item.user?.role ? <Text style={styles.userRole}>{item.user.role}</Text> : null}
        </View>
        <Pressable
          disabled={busy}
          hitSlop={8}
          onPress={() => handleDisconnect(item.id)}
          style={({ pressed }) => [styles.actionBtn, styles.dangerBtn, pressed && styles.pressed]}
        >
          {busy ? (
            <ActivityIndicator color={durianTheme.colors.danger} size="small" />
          ) : (
            <UserMinus color={durianTheme.colors.danger} size={18} />
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader
        eyebrow="MẠNG LƯỚI NÔNG DÂN"
        icon={Users}
        title="Kết nối"
        subtitle="Tìm kiếm và kết nối với nhà nông và kỹ sư trong cộng đồng DurianCare."
      />

      <View style={styles.tabs}>
        {(["browse", "requests", "connected"] as TabKey[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.activeTab]}
          >
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
              {t === "browse" ? "Khám phá" : t === "requests" ? `Lời mời${incomingRequests.length > 0 ? ` (${incomingRequests.length})` : ""}` : "Đang kết nối"}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "browse" ? (
        <>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Search color={durianTheme.colors.moss} size={18} />
              <TextInput
                onChangeText={setSearchQuery}
                onSubmitEditing={() => loadTab("browse")}
                placeholder="Tìm theo tên..."
                placeholderTextColor={durianTheme.colors.muted}
                returnKeyType="search"
                style={styles.searchInput}
                value={searchQuery}
              />
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => loadTab("browse")}
              style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]}
            >
              <RefreshCw color={durianTheme.colors.moss} size={18} />
            </Pressable>
          </View>
          <View style={styles.phoneRow}>
            <TextInput
              keyboardType="phone-pad"
              onChangeText={setPhoneQuery}
              placeholder="Tìm theo số điện thoại..."
              placeholderTextColor={durianTheme.colors.muted}
              returnKeyType="search"
              style={styles.phoneInput}
              value={phoneQuery}
            />
            <Pressable
              hitSlop={8}
              onPress={handlePhoneSearch}
              style={({ pressed }) => [styles.actionBtn, styles.primaryBtn, pressed && styles.pressed]}
            >
              <Search color={durianTheme.colors.mossDark} size={18} />
            </Pressable>
          </View>
          {phoneError ? (
            <Text style={styles.phoneError}>{phoneError}</Text>
          ) : phoneResult ? (
            <View style={styles.phoneResultCard}>
              {renderBrowseItem({ item: phoneResult })}
            </View>
          ) : null}
        </>
      ) : null}

      {loading ? (
        <ActivityIndicator color={durianTheme.colors.moss} style={styles.loader} />
      ) : null}

      {tab === "browse" ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={browseUsers}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.emptyText}>Chưa có người dùng nào.</Text>
            ) : null
          }
          renderItem={renderBrowseItem}
        />
      ) : tab === "requests" ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={incomingRequests}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.emptyText}>Không có lời mời kết nối nào.</Text>
            ) : null
          }
          renderItem={renderRequestItem}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={connections}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.emptyText}>Chưa có kết nối nào.</Text>
            ) : null
          }
          renderItem={renderConnectionItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  activeTab: { borderBottomColor: durianTheme.colors.moss, borderBottomWidth: 2 },
  activeTabText: { color: durianTheme.colors.moss, fontWeight: "900" },
  avatarText: { color: durianTheme.colors.mossDark, fontSize: 18, fontWeight: "900" },
  connectedBadge: { alignItems: "center", flexDirection: "row", gap: 5 },
  connectedText: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "800" },
  dangerBtn: { backgroundColor: "#FBE9E5" },
  emptyText: { color: durianTheme.colors.muted, fontSize: 14, paddingHorizontal: 18, paddingVertical: 24, textAlign: "center" },
  list: { gap: 10, padding: 16, paddingBottom: 40 },
  loader: { paddingVertical: 24 },
  mutedBtn: { backgroundColor: durianTheme.colors.mossSoft },
  phoneError: { color: durianTheme.colors.danger, fontSize: 12, paddingHorizontal: 18 },
  phoneInput: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 14,
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  phoneResultCard: { marginHorizontal: 16, marginTop: 4 },
  phoneRow: { alignItems: "center", flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 6 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  primaryBtn: { backgroundColor: durianTheme.colors.durianYellow },
  requestActions: { flexDirection: "row", gap: 8 },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  searchBox: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { color: durianTheme.colors.ink, flex: 1, fontSize: 13 },
  searchRow: { alignItems: "center", flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  refreshBtn: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  tab: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingBottom: 4,
  },
  tabs: {
    backgroundColor: durianTheme.colors.surface,
    borderBottomColor: durianTheme.colors.mossSoft,
    borderBottomWidth: 1,
    flexDirection: "row",
  },
  tabText: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "700" },
  userAvatar: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  userCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: durianTheme.radius.md,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  userInfo: { flex: 1, gap: 3 },
  userMeta: { color: durianTheme.colors.muted, fontSize: 11, lineHeight: 15 },
  userName: { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900", lineHeight: 20 },
  userRole: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "800", lineHeight: 15 },
});
