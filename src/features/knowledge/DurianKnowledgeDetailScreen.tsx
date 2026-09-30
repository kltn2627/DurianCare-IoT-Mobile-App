import { ArrowLeft, CalendarDays, Clock3, Maximize2, Minus, Plus, X } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { durianTheme } from "@/src/theme/durianTheme";

import { fetchKnowledgeArticle, type KnowledgeArticleDTO } from "./knowledgeApi";
import { findKnowledgeArticle } from "./knowledgeArticles";

const LOCAL_PLACEHOLDER = require("../../../assets/images/community/leaf-blight.jpg") as ImageSourcePropType;

export function DurianKnowledgeDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();
  const navigation = useDurianSafeNavigation();
  const articleSlug = Array.isArray(slug) ? slug[0] : slug;
  const localArticle = useMemo(
    () => (articleSlug ? findKnowledgeArticle(articleSlug) : undefined),
    [articleSlug],
  );
  const [apiArticle, setApiArticle] = useState<KnowledgeArticleDTO | null>(null);
  const [loadingApi, setLoadingApi] = useState(!localArticle);
  const [viewerVisible, setViewerVisible] = useState(false);

  useEffect(() => {
    if (localArticle || !articleSlug) return;
    setLoadingApi(true);
    fetchKnowledgeArticle(articleSlug)
      .then((dto) => setApiArticle(dto))
      .catch(() => setApiArticle(null))
      .finally(() => setLoadingApi(false));
  }, [articleSlug, localArticle]);

  if (loadingApi) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator color={durianTheme.colors.moss} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!localArticle && !apiArticle) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Không tìm thấy bài viết</Text>
          <Pressable
            onPress={() => navigation.replace("/(main)/knowledge")}
            style={({ pressed }) => [styles.backToListButton, pressed && styles.pressed]}
          >
            <Text style={styles.backToListText}>Về không gian tri thức</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (apiArticle && !localArticle) {
    const coverSource: ImageSourcePropType = apiArticle.coverImage
      ? { uri: apiArticle.coverImage }
      : LOCAL_PLACEHOLDER;
    const paragraphs = apiArticle.content
      ? apiArticle.content.split(/\n{2,}/).filter(Boolean)
      : [apiArticle.excerpt];
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Quay lại"
            hitSlop={10}
            onPress={() => navigation.replace("/(main)/knowledge")}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <ArrowLeft color={durianTheme.colors.mossDark} size={21} />
          </Pressable>
          <Text numberOfLines={1} style={styles.topBarTitle}>
            Cẩm nang DurianCare
          </Text>
          <View style={styles.topBarSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Image source={coverSource} resizeMode="cover" style={styles.cover} />
          <View style={styles.articleHeader}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{apiArticle.category}</Text>
            </View>
            <Text style={styles.title}>{apiArticle.title}</Text>
            <Text style={styles.excerpt}>{apiArticle.excerpt}</Text>
            <View style={styles.metaRow}>
              {apiArticle.publishedAt ? (
                <View style={styles.metaItem}>
                  <CalendarDays color={durianTheme.colors.moss} size={16} />
                  <Text style={styles.metaText}>{apiArticle.publishedAt}</Text>
                </View>
              ) : null}
              {apiArticle.readingTime ? (
                <View style={styles.metaItem}>
                  <Clock3 color={durianTheme.colors.moss} size={16} />
                  <Text style={styles.metaText}>{apiArticle.readingTime} phút đọc</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.author}>Biên soạn: {apiArticle.author}</Text>
          </View>
          <View style={styles.section}>
            {paragraphs.map((p, i) => (
              <Text key={`p-${i}`} style={styles.paragraph}>{p}</Text>
            ))}
          </View>
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              Nội dung dùng cho tham khảo kỹ thuật. Phác đồ hóa học cần được kỹ sư phụ trách xác
              nhận theo tình trạng vườn thực tế.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const article = localArticle!;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Quay lại"
          hitSlop={10}
          onPress={() => navigation.replace("/(main)/knowledge")}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ArrowLeft color={durianTheme.colors.mossDark} size={21} />
        </Pressable>
        <Text numberOfLines={1} style={styles.topBarTitle}>
          Cẩm nang DurianCare
        </Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityLabel="Mở ảnh kỹ thuật toàn màn hình"
          onPress={() => setViewerVisible(true)}
          style={({ pressed }) => [styles.imageButton, pressed && styles.pressed]}
        >
          <Image source={article.cover} resizeMode="cover" style={styles.cover} />
          <View style={styles.zoomBadge}>
            <Maximize2 color={durianTheme.colors.white} size={17} />
            <Text style={styles.zoomBadgeText}>Phóng to ảnh kỹ thuật</Text>
          </View>
        </Pressable>

        <View style={styles.articleHeader}>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{article.category}</Text>
          </View>
          <Text style={styles.title}>{article.title}</Text>
          <Text style={styles.excerpt}>{article.excerpt}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <CalendarDays color={durianTheme.colors.moss} size={16} />
              <Text style={styles.metaText}>{article.publishedAt}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock3 color={durianTheme.colors.moss} size={16} />
              <Text style={styles.metaText}>{article.readMinutes} phút đọc</Text>
            </View>
          </View>
          <Text style={styles.author}>Biên soạn: {article.author}</Text>
        </View>

        {article.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.heading}</Text>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
            {section.tips?.length ? (
              <View style={styles.tipCard}>
                <Text style={styles.tipTitle}>Gợi ý thực địa</Text>
                {section.tips.map((tip) => (
                  <View key={tip} style={styles.tipRow}>
                    <View style={styles.tipDot} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Nội dung dùng cho tham khảo kỹ thuật. Phác đồ hóa học cần được kỹ sư phụ trách xác
            nhận theo tình trạng vườn thực tế.
          </Text>
        </View>
      </ScrollView>

      <TechnicalImageViewer
        image={article.cover}
        onClose={() => setViewerVisible(false)}
        visible={viewerVisible}
      />
    </SafeAreaView>
  );
}

function TechnicalImageViewer({
  image,
  onClose,
  visible,
}: {
  image: ImageSourcePropType;
  onClose: () => void;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [zoom, setZoom] = useState(1);

  function closeViewer() {
    setZoom(1);
    onClose();
  }

  return (
    <Modal animationType="fade" onRequestClose={closeViewer} transparent visible={visible}>
      <View style={styles.viewer}>
        <Pressable
          accessibilityLabel="Đóng ảnh"
          hitSlop={10}
          onPress={closeViewer}
          style={[styles.viewerClose, { top: insets.top + 12 }]}
        >
          <X color={durianTheme.colors.white} size={24} />
        </Pressable>
        <ScrollView
          centerContent
          contentContainerStyle={styles.viewerContent}
          horizontal
          maximumZoomScale={4}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={image}
            resizeMode="contain"
            style={[styles.viewerImage, { transform: [{ scale: zoom }] }]}
          />
        </ScrollView>
        <View style={[styles.zoomControls, { bottom: insets.bottom + 22 }]}>
          <Pressable
            accessibilityLabel="Thu nhỏ ảnh"
            disabled={zoom <= 1}
            hitSlop={8}
            onPress={() => setZoom((current) => Math.max(1, current - 0.5))}
            style={({ pressed }) => [
              styles.zoomControlButton,
              zoom <= 1 && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Minus color={durianTheme.colors.mossDark} size={21} />
          </Pressable>
          <Text style={styles.zoomValue}>{Math.round(zoom * 100)}%</Text>
          <Pressable
            accessibilityLabel="Phóng to ảnh"
            disabled={zoom >= 3}
            hitSlop={8}
            onPress={() => setZoom((current) => Math.min(3, current + 0.5))}
            style={({ pressed }) => [
              styles.zoomControlButton,
              zoom >= 3 && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Plus color={durianTheme.colors.mossDark} size={21} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  articleHeader: { gap: 11 },
  author: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 15,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  backToListButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 20,
  },
  backToListText: {
    color: durianTheme.colors.mossDark,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  categoryChip: {
    alignSelf: "flex-start",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryText: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
    lineHeight: 14,
    textTransform: "uppercase",
  },
  content: { gap: 20, padding: 18, paddingBottom: 48 },
  cover: { height: 280, width: "100%" },
  disabled: { opacity: 0.4 },
  disclaimer: {
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 16,
    padding: 15,
  },
  disclaimerText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 19,
  },
  excerpt: {
    color: durianTheme.colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  imageButton: { borderRadius: 24, overflow: "hidden" },
  metaItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  metaRow: { flexDirection: "row", gap: 18 },
  metaText: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  notFound: { alignItems: "center", flex: 1, gap: 18, justifyContent: "center", padding: 24 },
  notFoundTitle: {
    color: durianTheme.colors.ink,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 28,
  },
  paragraph: {
    color: durianTheme.colors.ink,
    fontSize: 15,
    lineHeight: 25,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  section: { gap: 12 },
  sectionTitle: {
    color: durianTheme.colors.mossDark,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 27,
  },
  tipCard: {
    backgroundColor: "#FFF6CE",
    borderColor: durianTheme.colors.durianYellow,
    borderRadius: 18,
    borderWidth: 1,
    gap: 9,
    padding: 15,
  },
  tipDot: {
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 4,
    height: 7,
    marginTop: 7,
    width: 7,
  },
  tipRow: { alignItems: "flex-start", flexDirection: "row", gap: 9 },
  tipText: {
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  tipTitle: {
    color: durianTheme.colors.mossDark,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  title: {
    color: durianTheme.colors.ink,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: -0.8,
    lineHeight: 37,
  },
  topBar: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    flexDirection: "row",
    minHeight: 62,
    paddingHorizontal: 14,
  },
  topBarSpacer: { width: 44 },
  topBarTitle: {
    color: durianTheme.colors.white,
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
    textAlign: "center",
  },
  viewer: { backgroundColor: "rgba(8, 20, 14, 0.98)", flex: 1 },
  viewerClose: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    width: 44,
    zIndex: 2,
  },
  viewerContent: { alignItems: "center", flexGrow: 1, justifyContent: "center" },
  viewerImage: { height: 520, width: 390 },
  zoomBadge: {
    alignItems: "center",
    backgroundColor: "rgba(30, 61, 45, 0.84)",
    borderRadius: durianTheme.radius.pill,
    bottom: 12,
    flexDirection: "row",
    gap: 7,
    minHeight: 40,
    paddingHorizontal: 12,
    position: "absolute",
    right: 12,
  },
  zoomBadgeText: {
    color: durianTheme.colors.white,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
  },
  zoomControlButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 20,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  zoomControls: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 28,
    flexDirection: "row",
    gap: 15,
    padding: 6,
    position: "absolute",
  },
  zoomValue: {
    color: durianTheme.colors.white,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    minWidth: 45,
    textAlign: "center",
  },
});
