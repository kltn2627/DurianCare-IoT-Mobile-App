import * as ImagePicker from "expo-image-picker";
import { Flag, ImagePlus, RefreshCw, Search, Send, UsersRound, X } from "lucide-react-native";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { chatApi } from "@/src/features/chat/chatApi";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

import { CommunityPostCard } from "./CommunityPostCard";
import { communityApi } from "./communityApi";
import { canModerateCommunity, canWriteCommunity, COMMUNITY_POST_TOPICS, COMMUNITY_STATUS_LABELS, COMMUNITY_TOPICS, COMMUNITY_VISIBILITY_LABELS } from "./communityLabels";
import type { CommunityPage, CommunityPost, CommunityPostStatus, CommunityPostVisibility, CommunityReactionType, CommunityUploadFile } from "./communityTypes";
import { connectionApi, type ConnectionUser, type UserConnection } from "./connectionApi";

type TabKey = "FEED" | "CREATE" | "CONNECTIONS" | "PROFILE" | "ADMIN";

const PAGE_SIZE = 10;
const EMPTY_PAGE: CommunityPage<CommunityPost> = { items: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 0 };

export function DurianFarmerCommunity() {
  const navigation = useDurianSafeNavigation();
  const { session } = useSession();
  const role = session?.user.backendRole;
  const [tab, setTab] = useState<TabKey>("FEED");
  const [topic, setTopic] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [feed, setFeed] = useState(EMPTY_PAGE);
  const [mine, setMine] = useState<CommunityPost[]>([]);
  const [adminPosts, setAdminPosts] = useState<CommunityPost[]>([]);
  const [adminStatus, setAdminStatus] = useState<CommunityPostStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [connectionQuery, setConnectionQuery] = useState("");
  const [communityUsers, setCommunityUsers] = useState<ConnectionUser[]>([]);
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [incoming, setIncoming] = useState<UserConnection[]>([]);
  const [openingChatId, setOpeningChatId] = useState<string | null>(null);

  const isAdmin = canModerateCommunity(role);
  const canCreate = canWriteCommunity(role, session?.user.accountStatus);
  const activeTopic = topic === "Tất cả" ? "" : topic;

  const loadCommunity = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [feedPage, myPage, adminPage] = await Promise.all([
        communityApi.feed({ page: 0, query: search, size: PAGE_SIZE, topic: activeTopic }),
        communityApi.mine(0, 20),
        isAdmin ? communityApi.adminPosts({ page: 0, query: search, size: 20, status: adminStatus, topic: activeTopic }) : Promise.resolve(null),
      ]);
      setFeed(feedPage);
      setMine(myPage.items);
      if (adminPage) setAdminPosts(adminPage.items);
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTopic, adminStatus, isAdmin, search]);

  const loadConnections = useCallback(async () => {
    try {
      const [users, connected, incomingRequests] = await Promise.all([
        connectionApi.communityUsers(connectionQuery),
        connectionApi.connections(),
        connectionApi.incoming(),
      ]);
      setCommunityUsers(users.items);
      setConnections(connected.items);
      setIncoming(incomingRequests);
    } catch {
      // Connections are secondary to the post feed in this phase.
    }
  }, [connectionQuery]);

  useEffect(() => {
    void loadCommunity();
    void loadConnections();
  }, [loadCommunity, loadConnections]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || feed.page + 1 >= feed.totalPages) return;
    setLoadingMore(true);
    try {
      const next = await communityApi.feed({ page: feed.page + 1, query: search, size: PAGE_SIZE, topic: activeTopic });
      setFeed((current) => ({ ...next, items: [...current.items, ...next.items] }));
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoadingMore(false);
    }
  }, [activeTopic, feed.page, feed.totalPages, loading, loadingMore, search]);

  async function runPostAction(id: string, action: () => Promise<CommunityPost | void>) {
    if (actionId) return;
    setActionId(id);
    setError("");
    try {
      const updated = await action();
      if (updated) mergePost(updated);
      else await loadCommunity(true);
    } catch (actionError) {
      Alert.alert("Không thực hiện được", messageOf(actionError));
    } finally {
      setActionId(null);
    }
  }

  async function openConnectionChat(connection: UserConnection) {
    if (openingChatId) return;
    setOpeningChatId(connection.id);
    try {
      const { conversation } = await chatApi.createConversation({ peerUserId: connection.user.id });
      navigation.push(`/(main)/chat?conversationId=${encodeURIComponent(conversation.id)}`);
    } catch (chatError) {
      Alert.alert("Không mở được cuộc trò chuyện", messageOf(chatError));
    } finally {
      setOpeningChatId(null);
    }
  }

  function mergePost(updated: CommunityPost) {
    setFeed((current) => ({ ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) }));
    setMine((current) => current.map((item) => item.id === updated.id ? updated : item));
    setAdminPosts((current) => current.map((item) => item.id === updated.id ? updated : item));
  }

  const renderPost = useCallback(({ item }: { item: CommunityPost }) => {
    const canDelete = item.author.id === session?.user.id || isAdmin;
    return (
      <CommunityPostCard
        canDelete={canDelete}
        canModerate={isAdmin}
        onComment={() => navigation.push(`/(main)/community/${item.id}`)}
        onDelete={() => confirmDelete(item, () => runPostAction(item.id, async () => { await communityApi.delete(item.id); }))}
        onOpen={() => navigation.push(`/(main)/community/${item.id}`)}
        onReact={(type) => runPostAction(item.id, () => communityApi.react(item.id, type))}
        onReport={() => runPostAction(item.id, () => communityApi.report(item.id))}
        post={item}
      />
    );
  }, [isAdmin, navigation, session?.user.id]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader eyebrow="CỘNG ĐỒNG DURIANCARE" icon={UsersRound} title="Cộng đồng" subtitle="Bảng tin, bài viết, bình luận và kết nối đều dùng API thật." />
      <View style={styles.tabs}>
        <TabButton active={tab === "FEED"} label="Bảng tin" onPress={() => setTab("FEED")} />
        <TabButton active={tab === "CREATE"} label="Tạo bài" onPress={() => setTab("CREATE")} />
        <TabButton active={tab === "PROFILE"} label="Bài của tôi" onPress={() => setTab("PROFILE")} />
        <TabButton active={tab === "CONNECTIONS"} label="Kết nối" onPress={() => setTab("CONNECTIONS")} />
        {isAdmin ? <TabButton active={tab === "ADMIN"} label="Quản trị" onPress={() => setTab("ADMIN")} /> : null}
      </View>
      {tab === "FEED" ? (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={feed.items}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={loading ? <ActivityIndicator color={durianTheme.colors.moss} /> : <EmptyState text={error || "Bảng tin chưa có bài phù hợp."} />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={durianTheme.colors.moss} style={styles.loader} /> : null}
          ListHeaderComponent={<FeedFilters query={query} setQuery={setQuery} setSearch={setSearch} setTopic={setTopic} topic={topic} />}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.35}
          refreshControl={<RefreshControl colors={[durianTheme.colors.moss]} onRefresh={() => void loadCommunity(true)} refreshing={refreshing} tintColor={durianTheme.colors.moss} />}
          renderItem={renderPost}
        />
      ) : null}
      {tab === "CREATE" ? <CreatePostPanel canCreate={canCreate} onCreated={(post) => { setFeed((current) => ({ ...current, items: [post, ...current.items], totalElements: current.totalElements + 1 })); setMine((current) => [post, ...current]); setTab("FEED"); }} /> : null}
      {tab === "PROFILE" ? <ProfilePosts posts={mine} renderPost={renderPost} /> : null}
      {tab === "ADMIN" && isAdmin ? <AdminPosts actionId={actionId} adminStatus={adminStatus} onDelete={(post) => confirmDelete(post, () => runPostAction(post.id, async () => { await communityApi.delete(post.id); }))} onOpen={(post) => navigation.push(`/(main)/community/${post.id}`)} posts={adminPosts} setAdminStatus={setAdminStatus} /> : null}
      {tab === "CONNECTIONS" ? <ConnectionsPanel actionId={actionId} connections={connections} incoming={incoming} openingChatId={openingChatId} query={connectionQuery} setQuery={setConnectionQuery} users={communityUsers} onOpenChat={(connection) => void openConnectionChat(connection)} onRefresh={() => void loadConnections()} /> : null}
    </SafeAreaView>
  );
}

function FeedFilters({ query, setQuery, setSearch, setTopic, topic }: { query: string; setQuery: (value: string) => void; setSearch: (value: string) => void; setTopic: (value: string) => void; topic: string }) {
  return (
    <View style={styles.filterBlock}>
      <View style={styles.searchBox}><Search color={durianTheme.colors.moss} size={18} /><TextInput onChangeText={setQuery} onSubmitEditing={() => setSearch(query.trim())} placeholder="Tìm nội dung hoặc tác giả..." placeholderTextColor={durianTheme.colors.muted} style={styles.searchInput} value={query} /><Pressable onPress={() => setSearch(query.trim())} style={styles.searchButton}><Text style={styles.searchButtonText}>Tìm</Text></Pressable></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicTabs}>{COMMUNITY_TOPICS.map((item) => <Pressable key={item} onPress={() => setTopic(item)} style={[styles.topicButton, topic === item && styles.topicButtonActive]}><Text style={[styles.topicText, topic === item && styles.topicTextActive]}>{item}</Text></Pressable>)}</ScrollView>
    </View>
  );
}

function CreatePostPanel({ canCreate, onCreated }: { canCreate: boolean; onCreated: (post: CommunityPost) => void }) {
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState(COMMUNITY_POST_TOPICS[0]);
  const [visibility, setVisibility] = useState<CommunityPostVisibility>("PUBLIC");
  const [media, setMedia] = useState<CommunityUploadFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const pickMedia = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Cần quyền thư viện", "Cho phép DurianCare chọn ảnh/video cộng đồng.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.82, selectionLimit: 6 });
    if (result.canceled) return;
    const next = result.assets.slice(0, 6 - media.length).map((asset) => ({
      name: asset.fileName ?? `community-media-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
      type: asset.mimeType ?? (asset.type === "video" ? "video/mp4" : "image/jpeg"),
      uri: asset.uri,
    }));
    setMedia((current) => [...current, ...next].slice(0, 6));
  }, [media.length]);

  const submit = useCallback(async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await communityApi.create({ content: content.trim(), media, topic, visibility });
      setContent("");
      setMedia([]);
      onCreated(created);
    } catch (submitError) {
      setError(messageOf(submitError));
    } finally {
      setSubmitting(false);
    }
  }, [content, media, onCreated, topic, visibility]);

  if (!canCreate) return <View style={styles.panel}><Text style={styles.emptyText}>Chỉ tài khoản ACTIVE với role Farmer, Engineer hoặc Admin được tạo bài.</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.panel}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput multiline onChangeText={setContent} placeholder="Chia sẻ kinh nghiệm, hỏi đáp cùng bà con..." placeholderTextColor={durianTheme.colors.muted} style={styles.postInput} value={content} />
      <Text style={styles.sectionTitle}>Chủ đề</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicTabs}>{COMMUNITY_POST_TOPICS.map((item) => <Pressable key={item} onPress={() => setTopic(item)} style={[styles.topicButton, topic === item && styles.topicButtonActive]}><Text style={[styles.topicText, topic === item && styles.topicTextActive]}>{item}</Text></Pressable>)}</ScrollView>
      <Text style={styles.sectionTitle}>Hiển thị</Text>
      <View style={styles.visibilityRow}>{(["PUBLIC", "CONNECTIONS"] as CommunityPostVisibility[]).map((item) => <Pressable key={item} onPress={() => setVisibility(item)} style={[styles.visibilityButton, visibility === item && styles.topicButtonActive]}><Text style={[styles.topicText, visibility === item && styles.topicTextActive]}>{COMMUNITY_VISIBILITY_LABELS[item]}</Text></Pressable>)}</View>
      <Pressable onPress={() => void pickMedia()} style={styles.secondaryButton}><ImagePlus color={durianTheme.colors.moss} size={18} /><Text style={styles.secondaryButtonText}>Thêm ảnh/video ({media.length}/6)</Text></Pressable>
      {media.length ? <Text style={styles.mediaHint}>{media.map((item) => item.name).join(", ")}</Text> : null}
      <Pressable disabled={submitting || !content.trim()} onPress={() => void submit()} style={[styles.primaryButton, (submitting || !content.trim()) && styles.disabled]}>{submitting ? <ActivityIndicator color={durianTheme.colors.white} /> : <Send color={durianTheme.colors.white} size={18} />}<Text style={styles.primaryButtonText}>Đăng bài</Text></Pressable>
    </ScrollView>
  );
}

function ProfilePosts({ posts, renderPost }: { posts: CommunityPost[]; renderPost: ({ item }: { item: CommunityPost }) => ReactElement }) {
  return <FlatList contentContainerStyle={styles.listContent} data={posts} keyExtractor={(item) => item.id} ListEmptyComponent={<EmptyState text="Bạn chưa có bài viết cộng đồng nào." />} renderItem={renderPost} />;
}

function AdminPosts({ actionId, adminStatus, onDelete, onOpen, posts, setAdminStatus }: { actionId: string | null; adminStatus: CommunityPostStatus | ""; onDelete: (post: CommunityPost) => void; onOpen: (post: CommunityPost) => void; posts: CommunityPost[]; setAdminStatus: (status: CommunityPostStatus | "") => void }) {
  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={posts}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<EmptyState text="Không có bài trong bộ lọc quản trị." />}
      ListHeaderComponent={<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicTabs}>{(["", "PUBLISHED", "REPORTED", "HIDDEN"] as Array<CommunityPostStatus | "">).map((status) => <Pressable key={status || "ALL"} onPress={() => setAdminStatus(status)} style={[styles.topicButton, adminStatus === status && styles.topicButtonActive]}><Text style={[styles.topicText, adminStatus === status && styles.topicTextActive]}>{status ? COMMUNITY_STATUS_LABELS[status] : "Tất cả"}</Text></Pressable>)}</ScrollView>}
      renderItem={({ item }) => <View style={styles.adminRow}><Pressable onPress={() => onOpen(item)} style={styles.adminInfo}><Text style={styles.adminTitle}>{item.content.slice(0, 90)}</Text><Text style={styles.adminMeta}>{item.author.fullName} · {item.topic} · {COMMUNITY_STATUS_LABELS[item.status]}</Text></Pressable><Pressable disabled={actionId === item.id} onPress={() => onDelete(item)} style={styles.adminDelete}><X color={durianTheme.colors.danger} size={18} /></Pressable></View>}
    />
  );
}

function ConnectionsPanel({ actionId, connections, incoming, onOpenChat, openingChatId, onRefresh, query, setQuery, users }: { actionId: string | null; connections: UserConnection[]; incoming: UserConnection[]; onOpenChat: (connection: UserConnection) => void; openingChatId: string | null; onRefresh: () => void; query: string; setQuery: (value: string) => void; users: ConnectionUser[] }) {
  async function runConnection(id: string, action: () => Promise<unknown>) {
    try {
      await action();
      onRefresh();
    } catch (error) {
      Alert.alert("Không thực hiện được", messageOf(error));
    }
  }
  return (
    <ScrollView contentContainerStyle={styles.panel}>
      <View style={styles.searchBox}><Search color={durianTheme.colors.moss} size={18} /><TextInput onChangeText={setQuery} placeholder="Tìm người dùng..." style={styles.searchInput} value={query} /><Pressable onPress={onRefresh} style={styles.iconButton}><RefreshCw color={durianTheme.colors.moss} size={17} /></Pressable></View>
      <Text style={styles.sectionTitle}>Lời mời nhận được</Text>
      {incoming.length ? incoming.map((item) => <ConnectionRow key={item.id} label="Chấp nhận" loading={actionId === item.id} name={item.user.fullName} onPress={() => void runConnection(item.id, () => connectionApi.accept(item.id))} />) : <Text style={styles.emptyText}>Không có lời mời mới.</Text>}
      <Text style={styles.sectionTitle}>Gợi ý cộng đồng</Text>
      {users.map((user) => <ConnectionRow key={user.id} label={user.relationStatus === "NONE" ? "Kết nối" : user.relationStatus === "CONNECTED" ? "Đã kết nối" : "Đang chờ"} loading={false} name={user.fullName} onPress={() => user.relationStatus === "NONE" ? void runConnection(user.id, () => connectionApi.sendRequest(user.id, "COMMUNITY")) : undefined} />)}
      <Text style={styles.sectionTitle}>Đã kết nối</Text>
      {connections.length ? connections.map((item) => <ConnectionRow key={item.id} label="Nhắn tin" loading={openingChatId === item.id} name={item.user.fullName} onPress={() => onOpenChat(item)} />) : <Text style={styles.emptyText}>Chưa có kết nối.</Text>}
    </ScrollView>
  );
}

function ConnectionRow({ label, loading, name, onPress }: { label: string; loading: boolean; name: string; onPress: () => void }) {
  return <View style={styles.connectionRow}><View style={styles.connectionAvatar}><Text style={styles.connectionAvatarText}>{name.charAt(0).toUpperCase()}</Text></View><Text style={styles.connectionName}>{name}</Text><Pressable disabled={loading} onPress={onPress} style={[styles.smallButton, loading && styles.disabled]}>{loading ? <ActivityIndicator color={durianTheme.colors.mossDark} size="small" /> : <Text style={styles.smallButtonText}>{label}</Text>}</Pressable></View>;
}

function TabButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></Pressable>;
}

function EmptyState({ text }: { text: string }) {
  return <View style={styles.empty}><Flag color={durianTheme.colors.moss} size={28} /><Text style={styles.emptyText}>{text}</Text></View>;
}

function confirmDelete(post: CommunityPost, onConfirm: () => void) {
  Alert.alert("Ẩn bài viết?", "Backend sẽ chuyển trạng thái bài sang HIDDEN.", [
    { text: "Hủy", style: "cancel" },
    { onPress: onConfirm, style: "destructive", text: "Ẩn bài" },
  ]);
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Không thể xử lý Community.";
}

const styles = StyleSheet.create({
  adminDelete: { alignItems: "center", backgroundColor: "#FFF1ED", borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  adminInfo: { flex: 1 },
  adminMeta: { color: durianTheme.colors.muted, fontSize: 11, fontWeight: "800", marginTop: 4 },
  adminRow: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, marginHorizontal: 16, padding: 14 },
  adminTitle: { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900", lineHeight: 20 },
  connectionAvatar: { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  connectionAvatarText: { color: durianTheme.colors.durianYellow, fontWeight: "900" },
  connectionName: { color: durianTheme.colors.ink, flex: 1, fontSize: 14, fontWeight: "900" },
  connectionRow: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderRadius: 16, flexDirection: "row", gap: 10, padding: 12 },
  disabled: { opacity: 0.52 },
  empty: { alignItems: "center", gap: 8, padding: 26 },
  emptyText: { color: durianTheme.colors.muted, ...durianTheme.typography.body, textAlign: "center" },
  error: { backgroundColor: durianTheme.colors.dangerSoft, borderColor: durianTheme.colors.danger, borderRadius: durianTheme.radius.sm, borderWidth: 1, color: durianTheme.colors.danger, ...durianTheme.typography.caption, padding: 12 },
  filterBlock: { gap: 12, paddingBottom: 2 },
  iconButton: { alignItems: "center", backgroundColor: durianTheme.colors.mossSoft, borderRadius: 12, height: 36, justifyContent: "center", width: 36 },
  listContent: { gap: 12, paddingBottom: 34, paddingTop: 12 },
  loader: { paddingVertical: 16 },
  mediaHint: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  panel: { gap: 14, padding: 16, paddingBottom: 38 },
  postInput: { backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: 18, borderWidth: 1, color: durianTheme.colors.ink, minHeight: 150, padding: 14, textAlignVertical: "top" },
  primaryButton: { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: durianTheme.radius.sm, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: durianTheme.control.minHeight },
  primaryButtonText: { color: durianTheme.colors.white, fontSize: 14, fontWeight: "900" },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  searchBox: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 10, marginHorizontal: 16, minHeight: 50, paddingHorizontal: 12 },
  searchButton: { backgroundColor: durianTheme.colors.moss, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  searchButtonText: { color: durianTheme.colors.white, fontSize: 12, fontWeight: "900" },
  searchInput: { color: durianTheme.colors.ink, flex: 1, fontSize: 14 },
  secondaryButton: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderColor: "#DDE6DA", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 46 },
  secondaryButtonText: { color: durianTheme.colors.moss, fontSize: 14, fontWeight: "900" },
  sectionTitle: { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900", lineHeight: 20 },
  smallButton: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 12, minHeight: 36, justifyContent: "center", paddingHorizontal: 10 },
  smallButtonText: { color: durianTheme.colors.mossDark, fontSize: 12, fontWeight: "900" },
  tab: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderRadius: 12, justifyContent: "center", minHeight: 38, paddingHorizontal: 10 },
  tabActive: { backgroundColor: durianTheme.colors.moss },
  tabText: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "900" },
  tabTextActive: { color: durianTheme.colors.durianYellow },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 7, paddingHorizontal: 16, paddingVertical: 10 },
  topicButton: { backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: durianTheme.radius.pill, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 },
  topicButtonActive: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  topicTabs: { gap: 8, paddingHorizontal: 16 },
  topicText: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900" },
  topicTextActive: { color: durianTheme.colors.white },
  visibilityButton: { backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: 14, borderWidth: 1, flex: 1, paddingVertical: 11 },
  visibilityRow: { flexDirection: "row", gap: 8 },
});
