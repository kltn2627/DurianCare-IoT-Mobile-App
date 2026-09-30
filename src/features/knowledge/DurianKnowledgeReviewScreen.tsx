import { ArrowLeft, CheckCircle2, Search, ShieldCheck, XCircle } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

import { knowledgeApi } from "./knowledgeApi";
import { canReviewKnowledge, KNOWLEDGE_STATUS_COLORS, KNOWLEDGE_STATUS_FILTERS, KNOWLEDGE_STATUS_LABELS } from "./knowledgeLabels";
import type { KnowledgeArticle, KnowledgeArticlePage, KnowledgeStatus } from "./knowledgeTypes";

const EMPTY_PAGE: KnowledgeArticlePage = { articles: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

export function DurianKnowledgeReviewScreen() {
  const navigation = useDurianSafeNavigation();
  const { session } = useSession();
  const role = session?.user.backendRole;
  const [status, setStatus] = useState<KnowledgeStatus | "ALL">("REVIEW");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectingArticle, setRejectingArticle] = useState<KnowledgeArticle | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async (showRefresh = false) => {
    if (!canReviewKnowledge(role)) {
      setLoading(false);
      return;
    }
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await knowledgeApi.listAdmin({ page: 0, search, size: 20, sort: "updatedAt,desc", status: status === "ALL" ? undefined : status });
      setPage(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải hàng đợi duyệt.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = useCallback(async (article: KnowledgeArticle) => {
    setBusyId(article.id);
    try {
      await knowledgeApi.approve(article.id);
      await load(true);
    } catch (approveError) {
      Alert.alert("Không duyệt được", approveError instanceof Error ? approveError.message : "Vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  }, [load]);

  const reject = useCallback((article: KnowledgeArticle) => {
    setRejectingArticle(article);
    setRejectReason(article.rejectionReason ?? "");
  }, []);

  const closeRejectModal = useCallback(() => {
    if (busyId) return;
    setRejectingArticle(null);
    setRejectReason("");
  }, [busyId]);

  const submitReject = useCallback(async () => {
    if (!rejectingArticle) return;
    const reason = rejectReason.trim();
    if (!reason) {
      Alert.alert("Thiếu lý do", "Backend yêu cầu rejection reason.");
      return;
    }
    setBusyId(rejectingArticle.id);
    try {
      await knowledgeApi.reject(rejectingArticle.id, reason);
      setRejectingArticle(null);
      setRejectReason("");
      await load(true);
    } catch (rejectError) {
      Alert.alert("Không từ chối được", rejectError instanceof Error ? rejectError.message : "Vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  }, [load, rejectReason, rejectingArticle]);

  if (!canReviewKnowledge(role)) {
    return <SafeAreaView style={styles.center}><ShieldCheck color={durianTheme.colors.moss} size={34} /><Text style={styles.title}>Chỉ admin được duyệt Knowledge.</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.replace("/(main)/knowledge")} style={styles.iconButton}><ArrowLeft color={durianTheme.colors.mossDark} size={20} /></Pressable>
        <Text style={styles.topTitle}>Duyệt Knowledge</Text>
        <View style={styles.iconButtonGhost} />
      </View>
      <FlatList
        contentContainerStyle={styles.content}
        data={page.articles}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={loading ? <ActivityIndicator color={durianTheme.colors.moss} /> : <Text style={styles.empty}>{error ?? "Không có bài trong hàng đợi này."}</Text>}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.searchBox}><Search color={durianTheme.colors.moss} size={18} /><TextInput onChangeText={setQuery} onSubmitEditing={() => setSearch(query.trim())} placeholder="Tìm bài hoặc tác giả..." style={styles.searchInput} value={query} /><Pressable onPress={() => setSearch(query.trim())} style={styles.searchButton}><Text style={styles.searchButtonText}>Tìm</Text></Pressable></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{KNOWLEDGE_STATUS_FILTERS.filter((item) => item.value !== "DRAFT").map((item) => <Pressable key={item.value} onPress={() => setStatus(item.value)} style={[styles.tab, status === item.value && styles.tabActive]}><Text style={[styles.tabText, status === item.value && styles.tabTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>
            <Text style={styles.count}>{page.totalElements} bài theo bộ lọc</Text>
          </View>
        }
        refreshControl={<RefreshControl colors={[durianTheme.colors.moss]} onRefresh={() => void load(true)} refreshing={refreshing} tintColor={durianTheme.colors.moss} />}
        renderItem={({ item }) => <ReviewCard article={item} busy={busyId === item.id} onApprove={() => void approve(item)} onReject={() => reject(item)} />}
      />
      <Modal animationType="fade" onRequestClose={closeRejectModal} transparent visible={Boolean(rejectingArticle)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Từ chối bài viết</Text>
            <Text style={styles.modalBody}>{rejectingArticle?.title}</Text>
            <TextInput
              multiline
              onChangeText={setRejectReason}
              placeholder="Nhập lý do từ chối..."
              style={styles.reasonInput}
              textAlignVertical="top"
              value={rejectReason}
            />
            <View style={styles.modalActions}>
              <Pressable disabled={Boolean(busyId)} onPress={closeRejectModal} style={[styles.cancelButton, busyId && styles.disabled]}><Text style={styles.cancelText}>Hủy</Text></Pressable>
              <Pressable disabled={Boolean(busyId)} onPress={() => void submitReject()} style={[styles.confirmRejectButton, busyId && styles.disabled]}>{busyId ? <ActivityIndicator color={durianTheme.colors.white} size="small" /> : <XCircle color={durianTheme.colors.white} size={16} />}<Text style={styles.confirmRejectText}>Từ chối</Text></Pressable>
            </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function ReviewCard({ article, busy, onApprove, onReject }: { article: KnowledgeArticle; busy: boolean; onApprove: () => void; onReject: () => void }) {
  const colors = KNOWLEDGE_STATUS_COLORS[article.status];
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}><Text style={styles.cardTitle}>{article.title}</Text><Text style={[styles.status, { backgroundColor: colors.background, color: colors.text }]}>{KNOWLEDGE_STATUS_LABELS[article.status]}</Text></View>
      <Text style={styles.meta}>{article.author} · {article.category} · {article.updatedAt}</Text>
      <Text style={styles.excerpt}>{article.excerpt}</Text>
      {article.rejectionReason ? <Text style={styles.rejected}>Lý do từ chối: {article.rejectionReason}</Text> : null}
      {article.status === "REVIEW" ? <View style={styles.actions}><Pressable disabled={busy} onPress={onApprove} style={[styles.approveButton, busy && styles.disabled]}>{busy ? <ActivityIndicator color={durianTheme.colors.white} size="small" /> : <CheckCircle2 color={durianTheme.colors.white} size={16} />}<Text style={styles.approveText}>Duyệt</Text></Pressable><Pressable disabled={busy} onPress={onReject} style={[styles.rejectButton, busy && styles.disabled]}><XCircle color={durianTheme.colors.danger} size={16} /><Text style={styles.rejectText}>Từ chối</Text></Pressable></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  approveButton: { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 13, flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 42 },
  approveText: { color: durianTheme.colors.white, fontSize: 13, fontWeight: "900" },
  card: { backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: 18, borderWidth: 1, marginHorizontal: 18, padding: 15 },
  cardHeader: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  cardTitle: { color: durianTheme.colors.ink, flex: 1, fontSize: 16, fontWeight: "900", lineHeight: 22 },
  center: { alignItems: "center", backgroundColor: durianTheme.colors.canvas, flex: 1, gap: 12, justifyContent: "center", padding: 24 },
  content: { gap: 12, paddingBottom: 40, paddingTop: 14 },
  count: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900", marginHorizontal: 18 },
  disabled: { opacity: 0.55 },
  empty: { color: durianTheme.colors.muted, fontSize: 13, lineHeight: 20, padding: 30, textAlign: "center" },
  excerpt: { color: durianTheme.colors.muted, fontSize: 13, lineHeight: 20, marginTop: 9 },
  header: { gap: 12 },
  iconButton: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  iconButtonGhost: { height: 42, width: 42 },
  meta: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "800", lineHeight: 16, marginTop: 5 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  modalBackdrop: { alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.35)", flex: 1, justifyContent: "center", padding: 20 },
  modalScroll: { flexGrow: 1, justifyContent: "center", width: "100%" },
  modalBody: { color: durianTheme.colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  modalCard: { backgroundColor: durianTheme.colors.surface, borderRadius: 22, padding: 18, width: "100%" },
  modalTitle: { color: durianTheme.colors.ink, fontSize: 18, fontWeight: "900" },
  cancelButton: { alignItems: "center", backgroundColor: "#F6F4EA", borderRadius: 13, flex: 1, justifyContent: "center", minHeight: 44 },
  cancelText: { color: durianTheme.colors.moss, fontSize: 13, fontWeight: "900" },
  confirmRejectButton: { alignItems: "center", backgroundColor: durianTheme.colors.danger, borderRadius: 13, flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 44 },
  confirmRejectText: { color: durianTheme.colors.white, fontSize: 13, fontWeight: "900" },
  reasonInput: { backgroundColor: durianTheme.colors.canvas, borderColor: "#E4E1D1", borderRadius: 14, borderWidth: 1, color: durianTheme.colors.ink, fontSize: 14, lineHeight: 20, marginTop: 14, minHeight: 110, padding: 12 },
  rejected: { backgroundColor: "#FFF1ED", borderRadius: 12, color: durianTheme.colors.danger, fontSize: 12, fontWeight: "800", lineHeight: 18, marginTop: 10, padding: 10 },
  rejectButton: { alignItems: "center", backgroundColor: "#FFF5F2", borderColor: "#F2CDC5", borderRadius: 13, borderWidth: 1, flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", minHeight: 42 },
  rejectText: { color: durianTheme.colors.danger, fontSize: 13, fontWeight: "900" },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  searchBox: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 10, marginHorizontal: 18, minHeight: 50, paddingHorizontal: 12 },
  searchButton: { backgroundColor: durianTheme.colors.moss, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  searchButtonText: { color: durianTheme.colors.white, fontSize: 12, fontWeight: "900" },
  searchInput: { color: durianTheme.colors.ink, flex: 1, fontSize: 14 },
  status: { borderRadius: durianTheme.radius.pill, fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 8, paddingVertical: 5 },
  tab: { backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: durianTheme.radius.pill, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 },
  tabActive: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  tabText: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900" },
  tabTextActive: { color: durianTheme.colors.white },
  tabs: { gap: 8, paddingHorizontal: 18 },
  title: { color: durianTheme.colors.ink, fontSize: 18, fontWeight: "900", lineHeight: 25, textAlign: "center" },
  topBar: { alignItems: "center", backgroundColor: durianTheme.colors.moss, flexDirection: "row", minHeight: 62, paddingHorizontal: 14 },
  topTitle: { color: durianTheme.colors.white, flex: 1, fontSize: 16, fontWeight: "900", textAlign: "center" },
});
