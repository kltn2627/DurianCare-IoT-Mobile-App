import { ArrowLeft, CalendarDays, Clock3, Eye, Leaf, Share2, UserRound } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { DurianRemoteImage } from "@/src/components/DurianRemoteImage";
import { durianTheme } from "@/src/theme/durianTheme";

import { KnowledgeContentRenderer } from "./KnowledgeContentRenderer";
import { knowledgeApi } from "./knowledgeApi";
import type { KnowledgeArticle } from "./knowledgeTypes";

export function DurianKnowledgeDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const navigation = useDurianSafeNavigation();
  const articleSlug = Array.isArray(slug) ? slug[0] : slug;
  const [article, setArticle] = useState<KnowledgeArticle | null>(null);
  const [related, setRelated] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadArticle = useCallback(async () => {
    if (!articleSlug) return;
    setLoading(true);
    setError(null);
    try {
      const result = await knowledgeApi.get(articleSlug);
      setArticle(result);
      const relatedPage = await knowledgeApi.related(result.slug, 4);
      setRelated(relatedPage.articles);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải bài viết.");
    } finally {
      setLoading(false);
    }
  }, [articleSlug]);

  useEffect(() => {
    void loadArticle();
  }, [loadArticle]);

  const shareArticle = useCallback(async () => {
    if (!article) return;
    await Share.share({
      message: `${article.title}\n${article.excerpt}`,
      title: article.title,
    });
  }, [article]);

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={durianTheme.colors.moss} /><Text style={styles.centerText}>Đang tải bài viết thật...</Text></SafeAreaView>;
  }

  if (!article) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.notFoundTitle}>Không tìm thấy bài viết</Text>
        <Text style={styles.centerText}>{error ?? "Bài viết chưa published hoặc slug không tồn tại."}</Text>
        <Pressable onPress={() => navigation.replace("/(main)/knowledge")} style={styles.backToListButton}><Text style={styles.backToListText}>Về thư viện</Text></Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable accessibilityLabel="Quay lại" hitSlop={10} onPress={() => navigation.replace("/(main)/knowledge")} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <ArrowLeft color={durianTheme.colors.mossDark} size={21} />
        </Pressable>
        <Text numberOfLines={1} style={styles.topBarTitle}>Cẩm nang DurianCare</Text>
        <Pressable accessibilityLabel="Chia sẻ bài viết" hitSlop={10} onPress={() => void shareArticle()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Share2 color={durianTheme.colors.mossDark} size={20} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {article.coverImage ? (
          <DurianRemoteImage feature="knowledge-cover" uri={article.coverImage} resizeMode="cover" style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}><Leaf color={durianTheme.colors.moss} size={44} /></View>
        )}
        <View style={styles.articleHeader}>
          <View style={styles.categoryChip}><Text style={styles.categoryText}>{article.category}</Text></View>
          <Text style={styles.title}>{article.title}</Text>
          <Text style={styles.excerpt}>{article.excerpt}</Text>
          <View style={styles.metaWrap}>
            <Meta icon={<CalendarDays color={durianTheme.colors.moss} size={16} />} text={article.publishedAt || article.updatedAt} />
            <Meta icon={<Clock3 color={durianTheme.colors.moss} size={16} />} text={article.readingTime} />
            <Meta icon={<Eye color={durianTheme.colors.moss} size={16} />} text={`${article.views} lượt xem`} />
          </View>
          <View style={styles.authorRow}><UserRound color={durianTheme.colors.moss} size={16} /><Text style={styles.author}>Biên soạn: {article.author}</Text></View>
          {article.tags.length ? <View style={styles.tagWrap}>{article.tags.map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View> : null}
        </View>

        <KnowledgeContentRenderer content={article.content} />

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>Knowledge chưa có API comment, like hoặc bookmark riêng. Mobile chỉ hiển thị dữ liệu tương tác thật từ backend hiện có.</Text>
        </View>

        {related.length ? (
          <View style={styles.related}>
            <Text style={styles.relatedTitle}>Bài liên quan</Text>
            {related.map((item) => (
              <Pressable key={item.id} onPress={() => navigation.replace(`/(main)/knowledge/${item.slug}`)} style={({ pressed }) => [styles.relatedCard, pressed && styles.pressed]}>
                <Text style={styles.relatedCategory}>{item.category}</Text>
                <Text style={styles.relatedName}>{item.title}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Meta({ icon, text }: { icon: ReactNode; text: string }) {
  return <View style={styles.metaItem}>{icon}<Text style={styles.metaText}>{text || "Chưa cập nhật"}</Text></View>;
}

const styles = StyleSheet.create({
  articleHeader: { gap: 11 },
  author: { color: durianTheme.colors.moss, flex: 1, fontSize: 12, fontWeight: "800", lineHeight: 18 },
  authorRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  backButton: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 15, height: 44, justifyContent: "center", width: 44 },
  backToListButton: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 16, justifyContent: "center", minHeight: 48, paddingHorizontal: 20 },
  backToListText: { color: durianTheme.colors.mossDark, fontSize: 14, fontWeight: "900", lineHeight: 20 },
  categoryChip: { alignSelf: "flex-start", backgroundColor: durianTheme.colors.mossSoft, borderRadius: durianTheme.radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  categoryText: { color: durianTheme.colors.moss, fontSize: 10, fontWeight: "900", letterSpacing: 0.6, lineHeight: 14, textTransform: "uppercase" },
  center: { alignItems: "center", backgroundColor: durianTheme.colors.canvas, flex: 1, gap: 12, justifyContent: "center", padding: 24 },
  centerText: { color: durianTheme.colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center" },
  content: { gap: 20, padding: 18, paddingBottom: 48 },
  cover: { backgroundColor: durianTheme.colors.mossSoft, borderRadius: 24, height: 280, width: "100%" },
  coverFallback: { alignItems: "center", justifyContent: "center" },
  disclaimer: { backgroundColor: durianTheme.colors.mossSoft, borderRadius: 16, padding: 15 },
  disclaimerText: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "700", lineHeight: 19 },
  excerpt: { color: durianTheme.colors.muted, fontSize: 15, lineHeight: 23 },
  metaItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  metaText: { color: durianTheme.colors.muted, fontSize: 11, fontWeight: "700", lineHeight: 16 },
  metaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  notFoundTitle: { color: durianTheme.colors.ink, fontSize: 21, fontWeight: "900", lineHeight: 28 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  related: { gap: 10 },
  relatedCard: { backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: 16, borderWidth: 1, padding: 14 },
  relatedCategory: { color: durianTheme.colors.moss, fontSize: 10, fontWeight: "900", lineHeight: 14 },
  relatedName: { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900", lineHeight: 20, marginTop: 4 },
  relatedTitle: { color: durianTheme.colors.ink, fontSize: 18, fontWeight: "900", lineHeight: 24 },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  tag: { backgroundColor: "#F1EFE2", borderRadius: durianTheme.radius.pill, color: durianTheme.colors.moss, fontSize: 11, fontWeight: "800", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  title: { color: durianTheme.colors.ink, fontSize: 29, fontWeight: "900", lineHeight: 37 },
  topBar: { alignItems: "center", backgroundColor: durianTheme.colors.moss, flexDirection: "row", minHeight: 62, paddingHorizontal: 14 },
  topBarTitle: { color: durianTheme.colors.white, flex: 1, fontSize: 16, fontWeight: "900", lineHeight: 22, textAlign: "center" },
});
