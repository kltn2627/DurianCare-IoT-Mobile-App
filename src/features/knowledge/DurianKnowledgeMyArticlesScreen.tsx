import { ArrowLeft, Edit3, FilePlus2, Leaf, RefreshCw, Send, Trash2 } from "lucide-react-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

import { knowledgeApi } from "./knowledgeApi";
import { canEditKnowledge, canWriteKnowledge, KNOWLEDGE_STATUS_COLORS, KNOWLEDGE_STATUS_FILTERS, KNOWLEDGE_STATUS_LABELS } from "./knowledgeLabels";
import type { KnowledgeArticle, KnowledgeArticlePage, KnowledgeStatus } from "./knowledgeTypes";

const EMPTY_PAGE: KnowledgeArticlePage = { articles: [], page: 0, size: 100, totalElements: 0, totalPages: 0 };

export function DurianKnowledgeMyArticlesScreen() {
  const navigation = useDurianSafeNavigation();
  const { session } = useSession();
  const role = session?.user.backendRole;
  const [status, setStatus] = useState<KnowledgeStatus | "ALL">("ALL");
  const [page, setPage] = useState(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (!canWriteKnowledge(role)) {
      setLoading(false);
      return;
    }
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await knowledgeApi.listMine({ page: 0, size: 100, sort: "updatedAt,desc", status: status === "ALL" ? undefined : status });
      setPage(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải bài viết của tôi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitForReview = useCallback(async (article: KnowledgeArticle) => {
    setBusyId(article.id);
    try {
      await knowledgeApi.save({
        author: article.author,
        category: article.category,
        content: article.content,
        excerpt: article.excerpt,
        featured: false,
        status: "REVIEW",
        tags: article.tags,
        title: article.title,
      }, article.id);
      await load(true);
    } catch (submitError) {
      Alert.alert("Không gửi duyệt được", submitError instanceof Error ? submitError.message : "Vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  }, [load]);

  const deleteArticle = useCallback((article: KnowledgeArticle) => {
    Alert.alert("Xóa bài viết?", "Backend sẽ xóa bài viết, không phải ẩn cục bộ trên Mobile.", [
      { text: "Hủy", style: "cancel" },
      {
        onPress: () => {
          void (async () => {
            setBusyId(article.id);
            try {
              await knowledgeApi.delete(article.id);
              await load(true);
            } catch (deleteError) {
              Alert.alert("Không xóa được", deleteError instanceof Error ? deleteError.message : "Vui lòng thử lại.");
            } finally {
              setBusyId(null);
            }
          })();
        },
        style: "destructive",
        text: "Xóa",
      },
    ]);
  }, [load]);

  if (!canWriteKnowledge(role)) {
    return <SafeAreaView style={styles.center}><Leaf color={durianTheme.colors.moss} size={34} /><Text style={styles.title}>Chỉ kỹ sư hoặc admin được tạo bài Knowledge.</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.replace("/(main)/knowledge")} style={styles.iconButton}><ArrowLeft color={durianTheme.colors.mossDark} size={20} /></Pressable>
        <Text style={styles.topTitle}>Bài kiến thức của tôi</Text>
        <Pressable onPress={() => navigation.push("/(main)/knowledge/create")} style={styles.iconButton}><FilePlus2 color={durianTheme.colors.mossDark} size={20} /></Pressable>
      </View>
      <FlatList
        contentContainerStyle={styles.content}
        data={page.articles}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={loading ? <ActivityIndicator color={durianTheme.colors.moss} /> : <EmptyText text={error ?? "Chưa có bài nào trong trạng thái này."} />}
        ListHeaderComponent={<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{KNOWLEDGE_STATUS_FILTERS.map((item) => <StatusFilter active={status === item.value} key={item.value} label={item.label} onPress={() => setStatus(item.value)} />)}</ScrollView>}
        refreshControl={<RefreshControl colors={[durianTheme.colors.moss]} onRefresh={() => void load(true)} refreshing={refreshing} tintColor={durianTheme.colors.moss} />}
        renderItem={({ item }) => <ArticleRow article={item} busy={busyId === item.id} onDelete={() => deleteArticle(item)} onEdit={() => navigation.push(`/(main)/knowledge/edit/${item.id}`)} onSubmit={() => void submitForReview(item)} role={role} />}
      />
    </SafeAreaView>
  );
}

function StatusFilter({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}><Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text></Pressable>;
}

function ArticleRow({ article, busy, onDelete, onEdit, onSubmit, role }: { article: KnowledgeArticle; busy: boolean; onDelete: () => void; onEdit: () => void; onSubmit: () => void; role?: string | null }) {
  const colors = KNOWLEDGE_STATUS_COLORS[article.status];
  const editable = canEditKnowledge(role, article.status);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{article.title}</Text>
        <Text style={[styles.status, { backgroundColor: colors.background, color: colors.text }]}>{KNOWLEDGE_STATUS_LABELS[article.status]}</Text>
      </View>
      <Text style={styles.meta}>{article.category} · cập nhật {article.updatedAt || "chưa rõ"}</Text>
      <Text style={styles.excerpt}>{article.excerpt}</Text>
      {article.status === "REJECTED" && article.rejectionReason ? <Text style={styles.rejected}>Lý do từ chối: {article.rejectionReason}</Text> : null}
      <View style={styles.actions}>
        {editable ? <ActionButton icon={<Edit3 color={durianTheme.colors.moss} size={16} />} label="Sửa" onPress={onEdit} /> : null}
        {(article.status === "DRAFT" || article.status === "REJECTED") ? <ActionButton disabled={busy} icon={busy ? <ActivityIndicator color={durianTheme.colors.white} size="small" /> : <Send color={durianTheme.colors.white} size={16} />} label="Gửi duyệt" onPress={onSubmit} primary /> : null}
        {role === "ADMIN" ? <ActionButton icon={<Trash2 color={durianTheme.colors.danger} size={16} />} label="Xóa" onPress={onDelete} danger /> : null}
      </View>
    </View>
  );
}

function ActionButton({ danger, disabled, icon, label, onPress, primary }: { danger?: boolean; disabled?: boolean; icon: ReactNode; label: string; onPress: () => void; primary?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.actionButton, primary && styles.primaryButton, danger && styles.dangerButton, disabled && styles.disabled]}>{icon}<Text style={[styles.actionText, primary && styles.primaryText, danger && styles.dangerText]}>{label}</Text></Pressable>;
}

function EmptyText({ text }: { text: string }) {
  return <View style={styles.empty}><RefreshCw color={durianTheme.colors.moss} size={24} /><Text style={styles.emptyText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  actionButton: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderColor: "#DDE6DA", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 40, paddingHorizontal: 12 },
  actionText: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  card: { backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: 18, borderWidth: 1, marginHorizontal: 18, padding: 15 },
  cardHeader: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  cardTitle: { color: durianTheme.colors.ink, flex: 1, fontSize: 16, fontWeight: "900", lineHeight: 22 },
  center: { alignItems: "center", backgroundColor: durianTheme.colors.canvas, flex: 1, gap: 12, justifyContent: "center", padding: 24 },
  content: { gap: 12, paddingBottom: 40, paddingTop: 14 },
  dangerButton: { backgroundColor: "#FFF5F2", borderColor: "#F2CDC5" },
  dangerText: { color: durianTheme.colors.danger },
  disabled: { opacity: 0.55 },
  empty: { alignItems: "center", gap: 10, padding: 30 },
  emptyText: { color: durianTheme.colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center" },
  excerpt: { color: durianTheme.colors.muted, fontSize: 13, lineHeight: 20, marginTop: 9 },
  iconButton: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  meta: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "800", lineHeight: 16, marginTop: 5 },
  primaryButton: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  primaryText: { color: durianTheme.colors.white },
  rejected: { backgroundColor: "#FFF1ED", borderRadius: 12, color: durianTheme.colors.danger, fontSize: 12, fontWeight: "800", lineHeight: 18, marginTop: 10, padding: 10 },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
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
