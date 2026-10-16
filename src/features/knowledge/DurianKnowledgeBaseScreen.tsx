import { BookOpen, ChevronRight, Clock3, FilePenLine, Leaf, Search, ShieldCheck, UserRound } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { DurianRemoteImage } from "@/src/components/DurianRemoteImage";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

import { knowledgeApi } from "./knowledgeApi";
import { canReviewKnowledge, canWriteKnowledge } from "./knowledgeLabels";
import type { KnowledgeArticle, KnowledgeArticlePage, KnowledgeCategoryCount } from "./knowledgeTypes";

const PAGE_SIZE = 12;
const EMPTY_PAGE: KnowledgeArticlePage = { articles: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 0 };

export function DurianKnowledgeBaseScreen() {
  const navigation = useDurianSafeNavigation();
  const { session } = useSession();
  const role = session?.user.backendRole;
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [category, setCategory] = useState("Tất cả");
  const [page, setPage] = useState(EMPTY_PAGE);
  const [categories, setCategories] = useState<KnowledgeCategoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryTabs = useMemo(() => {
    const seen = new Set<string>();
    const tabs: string[] = [];

    for (const value of ["Tất cả", ...categories.map((item) => item.category)]) {
      const normalizedValue = value.trim();
      if (!normalizedValue || seen.has(normalizedValue)) continue;
      seen.add(normalizedValue);
      tabs.push(normalizedValue);
    }

    return tabs;
  }, [categories]);

  const loadFirstPage = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [articlePage, categoryCounts] = await Promise.all([
        knowledgeApi.list({ category, page: 0, search: committedQuery, size: PAGE_SIZE, sort: "publishedAt,desc" }),
        knowledgeApi.categories(),
      ]);
      setPage(articlePage);
      setCategories(categoryCounts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải thư viện kiến thức.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, committedQuery]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || page.page + 1 >= page.totalPages) return;
    setLoadingMore(true);
    try {
      const nextPage = await knowledgeApi.list({ category, page: page.page + 1, search: committedQuery, size: PAGE_SIZE, sort: "publishedAt,desc" });
      setPage((current) => ({ ...nextPage, articles: [...current.articles, ...nextPage.articles] }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải thêm bài viết.");
    } finally {
      setLoadingMore(false);
    }
  }, [category, committedQuery, loading, loadingMore, page.page, page.totalPages]);

  const openArticle = useCallback((slug: string) => navigation.push(`/(main)/knowledge/${slug}`), [navigation]);
  const renderArticle = useCallback(({ item }: { item: KnowledgeArticle }) => <ArticleCard article={item} onPress={() => openArticle(item.slug)} />, [openArticle]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        contentContainerStyle={styles.content}
        data={page.articles}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={loading ? null : <EmptyState text={error ?? (committedQuery || category !== "Tất cả" ? "Không có bài phù hợp với bộ lọc hiện tại." : "Chưa có bài kiến thức published từ backend.")} />}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={durianTheme.colors.moss} style={styles.footerLoader} /> : null}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.heroIcon}><BookOpen color={durianTheme.colors.mossDark} size={27} /></View>
                <View style={styles.heroActions}>
                  {canWriteKnowledge(role) ? <Pressable onPress={() => navigation.push("/(main)/knowledge/my-articles")} style={styles.heroActionButton}><FilePenLine color={durianTheme.colors.white} size={18} /></Pressable> : null}
                  {canReviewKnowledge(role) ? <Pressable onPress={() => navigation.push("/(main)/knowledge/review")} style={styles.heroActionButton}><ShieldCheck color={durianTheme.colors.white} size={18} /></Pressable> : null}
                </View>
              </View>
              <Text style={styles.eyebrow}>KHÔNG GIAN TRI THỨC</Text>
              <Text style={styles.title}>Cẩm nang vườn sầu riêng</Text>
              <Text style={styles.subtitle}>Bài viết published từ backend Knowledge, đồng bộ với Web.</Text>
            </View>
            <View style={styles.searchBox}>
              <Search color={durianTheme.colors.moss} size={20} />
              <TextInput onChangeText={setQuery} onSubmitEditing={() => setCommittedQuery(query.trim())} placeholder="Tìm tiêu đề hoặc tóm tắt..." placeholderTextColor={durianTheme.colors.muted} returnKeyType="search" style={styles.searchInput} value={query} />
              <Pressable onPress={() => setCommittedQuery(query.trim())} style={styles.searchButton}><Text style={styles.searchButtonText}>Tìm</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabs}>
              {categoryTabs.map((item) => {
                const active = item === category;
                return <Pressable key={item} onPress={() => setCategory(item)} style={[styles.categoryTab, active && styles.categoryTabActive]}><Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>{item}</Text></Pressable>;
              })}
            </ScrollView>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Bài viết mới</Text>
              <Text style={styles.resultCount}>{page.totalElements} bài</Text>
            </View>
            {loading ? <ActivityIndicator color={durianTheme.colors.moss} style={styles.loader} /> : null}
          </View>
        }
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.35}
        refreshControl={<RefreshControl colors={[durianTheme.colors.moss]} onRefresh={() => void loadFirstPage(true)} refreshing={refreshing} tintColor={durianTheme.colors.moss} />}
        renderItem={renderArticle}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function EmptyState({ text }: { text: string }) {
  return <View style={styles.emptyState}><Leaf color={durianTheme.colors.moss} size={34} /><Text style={styles.emptyTitle}>Chưa tìm thấy bài viết</Text><Text style={styles.emptyText}>{text}</Text></View>;
}

function ArticleCard({ article, onPress }: { article: KnowledgeArticle; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" hitSlop={4} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressedCard]}>
      {article.coverImage ? <DurianRemoteImage feature="knowledge-cover" uri={article.coverImage} resizeMode="cover" style={styles.cover} /> : <View style={[styles.cover, styles.coverFallback]}><Leaf color={durianTheme.colors.moss} size={38} /></View>}
      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          <View style={styles.categoryChip}><Text style={styles.categoryText}>{article.category}</Text></View>
          <View style={styles.readTime}><Clock3 color={durianTheme.colors.muted} size={14} /><Text style={styles.readTimeText}>{article.readingTime}</Text></View>
        </View>
        <Text style={styles.cardTitle}>{article.title}</Text>
        <View style={styles.authorRow}><UserRound color={durianTheme.colors.moss} size={15} /><Text style={styles.authorText}>{article.author}</Text></View>
        <Text numberOfLines={3} style={styles.excerpt}>{article.excerpt}</Text>
        <View style={styles.readMore}><Text style={styles.readMoreText}>Đọc tiếp</Text><ChevronRight color={durianTheme.colors.moss} size={18} /></View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  authorRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  authorText: { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "800", lineHeight: 16 },
  card: { backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.border, borderRadius: durianTheme.radius.md, borderWidth: 1, marginHorizontal: durianTheme.spacing.xl, overflow: "hidden", ...durianTheme.shadow.card },
  cardBody: { gap: 9, padding: 16 },
  cardTitle: { color: durianTheme.colors.ink, fontSize: 19, fontWeight: "900", lineHeight: 25 },
  categoryChip: { backgroundColor: durianTheme.colors.mossSoft, borderRadius: durianTheme.radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  categoryTab: { backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: durianTheme.radius.pill, borderWidth: 1, minHeight: 40, paddingHorizontal: 14, paddingVertical: 10 },
  categoryTabActive: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  categoryTabText: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900", lineHeight: 16 },
  categoryTabTextActive: { color: durianTheme.colors.white },
  categoryTabs: { gap: 8, paddingHorizontal: 18 },
  categoryText: { color: durianTheme.colors.moss, fontSize: 9, fontWeight: "900", letterSpacing: 0.5, lineHeight: 13, textTransform: "uppercase" },
  content: { gap: durianTheme.spacing.lg, paddingBottom: 42 },
  cover: { height: 190, width: "100%" },
  coverFallback: { alignItems: "center", backgroundColor: durianTheme.colors.mossSoft, justifyContent: "center" },
  emptyState: { alignItems: "center", gap: 7, marginHorizontal: 18, paddingHorizontal: 24, paddingVertical: 42 },
  emptyText: { color: durianTheme.colors.muted, ...durianTheme.typography.body, textAlign: "center" },
  emptyTitle: { color: durianTheme.colors.ink, ...durianTheme.typography.section },
  eyebrow: { color: durianTheme.colors.durianYellow, fontSize: 10, fontWeight: "900", letterSpacing: 1.2, lineHeight: 14, marginTop: 12 },
  excerpt: { color: durianTheme.colors.muted, fontSize: 13, lineHeight: 20 },
  footerLoader: { paddingVertical: 18 },
  header: { gap: 14, marginBottom: 2 },
  hero: { alignItems: "flex-start", backgroundColor: durianTheme.colors.moss, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, padding: 22 },
  heroActionButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  heroActions: { flexDirection: "row", gap: 8 },
  heroIcon: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 17, height: 52, justifyContent: "center", width: 52 },
  heroTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", width: "100%" },
  loader: { paddingTop: 8 },
  metaRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  pressedCard: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  readMore: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 4, minHeight: 44 },
  readMoreText: { color: durianTheme.colors.moss, fontSize: 13, fontWeight: "900", lineHeight: 18 },
  readTime: { alignItems: "center", flexDirection: "row", gap: 5 },
  readTimeText: { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "700", lineHeight: 14 },
  resultCount: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "800", lineHeight: 17 },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  searchBox: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 10, marginHorizontal: 18, minHeight: 52, paddingHorizontal: 14 },
  searchButton: { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 12, justifyContent: "center", minHeight: 34, paddingHorizontal: 12 },
  searchButtonText: { color: durianTheme.colors.white, fontSize: 12, fontWeight: "900" },
  searchInput: { color: durianTheme.colors.ink, flex: 1, fontSize: 14, lineHeight: 20, paddingVertical: 12 },
  sectionHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginHorizontal: 18, marginTop: 3 },
  sectionTitle: { color: durianTheme.colors.ink, fontSize: 18, fontWeight: "900", lineHeight: 24 },
  subtitle: { color: durianTheme.colors.mist, fontSize: 14, lineHeight: 21, marginTop: 8 },
  title: { color: durianTheme.colors.white, fontSize: 28, fontWeight: "900", lineHeight: 35, marginTop: 3 },
});
