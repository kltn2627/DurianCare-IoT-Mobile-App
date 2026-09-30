import {
  BookOpen,
  ChevronRight,
  Clock3,
  Leaf,
  Search,
  UserRound,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { durianTheme } from "@/src/theme/durianTheme";

import { fetchKnowledgeArticles, type KnowledgeArticleDTO } from "./knowledgeApi";
import { knowledgeArticles } from "./knowledgeArticles";

type DisplayArticle = {
  id: string;
  slug: string;
  title: string;
  category: string;
  author: string;
  excerpt: string;
  cover: ImageSourcePropType | { uri: string };
  readMinutes: number;
  publishedAt: string;
};

const LOCAL_PLACEHOLDER = require("../../../assets/images/community/leaf-blight.jpg") as ImageSourcePropType;

function toDisplayArticle(dto: KnowledgeArticleDTO): DisplayArticle {
  return {
    id: dto.id,
    slug: dto.slug,
    title: dto.title,
    category: dto.category,
    author: dto.author,
    excerpt: dto.excerpt,
    cover: dto.coverImage ? { uri: dto.coverImage } : LOCAL_PLACEHOLDER,
    readMinutes: dto.readingTime ? parseInt(dto.readingTime, 10) || 5 : 5,
    publishedAt: dto.publishedAt ?? "",
  };
}

export function DurianKnowledgeBaseScreen() {
  const navigation = useDurianSafeNavigation();
  const [query, setQuery] = useState("");
  const [apiArticles, setApiArticles] = useState<DisplayArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKnowledgeArticles()
      .then((list) => setApiArticles(list.map(toDisplayArticle)))
      .catch(() => {/* fallback to local articles */})
      .finally(() => setLoading(false));
  }, []);

  const localDisplayArticles = useMemo(
    () =>
      knowledgeArticles.map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        category: a.category,
        author: a.author,
        excerpt: a.excerpt,
        cover: a.cover as ImageSourcePropType,
        readMinutes: a.readMinutes,
        publishedAt: a.publishedAt,
      })),
    [],
  );

  const allArticles = apiArticles.length > 0 ? apiArticles : localDisplayArticles;

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
    if (!normalizedQuery) return allArticles;
    return allArticles.filter((article) =>
      [article.title, article.category, article.author, article.excerpt]
        .join(" ")
        .toLocaleLowerCase("vi-VN")
        .includes(normalizedQuery),
    );
  }, [query, allArticles]);

  const openArticle = useCallback(
    (slug: string) => navigation.push(`/(main)/knowledge/${slug}`),
    [navigation],
  );

  const renderArticle = useCallback(
    ({ item }: { item: DisplayArticle }) => (
      <ArticleCard article={item} onPress={() => openArticle(item.slug)} />
    ),
    [openArticle],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        contentContainerStyle={styles.content}
        data={filteredArticles}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={durianTheme.colors.moss} style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <Leaf color={durianTheme.colors.moss} size={34} />
              <Text style={styles.emptyTitle}>Chưa tìm thấy cẩm nang phù hợp</Text>
              <Text style={styles.emptyText}>Thử tìm theo bệnh lá, VietGAP hoặc dinh dưỡng.</Text>
            </View>
          )
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <BookOpen color={durianTheme.colors.mossDark} size={27} />
              </View>
              <Text style={styles.eyebrow}>KHÔNG GIAN TRI THỨC</Text>
              <Text style={styles.title}>Cẩm nang vườn sầu riêng</Text>
              <Text style={styles.subtitle}>
                Kiến thức VietGAP, bệnh lá và dinh dưỡng được biên soạn cho thao tác thực địa.
              </Text>
            </View>
            <View style={styles.searchBox}>
              <Search color={durianTheme.colors.moss} size={20} />
              <TextInput
                onChangeText={setQuery}
                placeholder="Tìm cẩm nang, bệnh hoặc kỹ thuật..."
                placeholderTextColor={durianTheme.colors.muted}
                returnKeyType="search"
                style={styles.searchInput}
                value={query}
              />
            </View>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Bài viết mới</Text>
              <Text style={styles.resultCount}>{filteredArticles.length} bài</Text>
            </View>
          </View>
        }
        renderItem={renderArticle}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function ArticleCard({
  article,
  onPress,
}: {
  article: DisplayArticle;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressedCard]}
    >
      <Image source={article.cover} resizeMode="cover" style={styles.cover} />
      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{article.category}</Text>
          </View>
          <View style={styles.readTime}>
            <Clock3 color={durianTheme.colors.muted} size={14} />
            <Text style={styles.readTimeText}>{article.readMinutes} phút đọc</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>{article.title}</Text>
        <View style={styles.authorRow}>
          <UserRound color={durianTheme.colors.moss} size={15} />
          <Text style={styles.authorText}>{article.author}</Text>
        </View>
        <Text numberOfLines={3} style={styles.excerpt}>
          {article.excerpt}
        </Text>
        <View style={styles.readMore}>
          <Text style={styles.readMoreText}>Đọc tiếp</Text>
          <ChevronRight color={durianTheme.colors.moss} size={18} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#E8E4D4",
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 18,
    overflow: "hidden",
  },
  cardBody: { gap: 9, padding: 16 },
  authorRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  authorText: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
  },
  cardTitle: {
    color: durianTheme.colors.ink,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.25,
    lineHeight: 25,
  },
  categoryChip: {
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  categoryText: {
    color: durianTheme.colors.moss,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    lineHeight: 13,
    textTransform: "uppercase",
  },
  content: { gap: 14, paddingBottom: 42 },
  cover: { height: 190, width: "100%" },
  loader: { paddingVertical: 42 },
  emptyState: {
    alignItems: "center",
    gap: 7,
    marginHorizontal: 18,
    paddingHorizontal: 24,
    paddingVertical: 42,
  },
  emptyText: {
    color: durianTheme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  emptyTitle: {
    color: durianTheme.colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
  excerpt: {
    color: durianTheme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  eyebrow: {
    color: durianTheme.colors.durianYellow,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    lineHeight: 14,
    marginTop: 12,
  },
  header: { gap: 14, marginBottom: 2 },
  hero: {
    alignItems: "flex-start",
    backgroundColor: durianTheme.colors.moss,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    padding: 22,
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 17,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  metaRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  pressedCard: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  readMore: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    minHeight: 44,
  },
  readMoreText: {
    color: durianTheme.colors.moss,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  readTime: { alignItems: "center", flexDirection: "row", gap: 5 },
  readTimeText: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
  },
  resultCount: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  searchBox: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#E4E1D1",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 18,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 12,
  },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 18,
    marginTop: 3,
  },
  sectionTitle: {
    color: durianTheme.colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
  },
  subtitle: {
    color: durianTheme.colors.mist,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  title: {
    color: durianTheme.colors.white,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.7,
    lineHeight: 35,
    marginTop: 3,
  },
});
