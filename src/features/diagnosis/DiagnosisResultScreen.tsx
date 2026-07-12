import { ArrowLeft, CalendarDays, Clock3, ExternalLink, Info, Leaf, RefreshCw, Search } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { durianTheme } from "@/src/theme/durianTheme";

import { getDiagnosisDetail } from "./diseaseDetails";
import { getDiagnosisHistoryEntry } from "./diagnosisHistoryStore";
import type { DiagnosisHistoryEntry } from "./types";

function formatDateTime(value?: string | null) {
  if (!value) return "Vừa xong";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseConfidence(value?: string | string[] | null) {
  const raw = Array.isArray(value) ? value[0] : value;
  const number = raw ? Number(raw) : NaN;
  return Number.isFinite(number) ? number : 0;
}

function buildFallbackEntry(params: {
  confidence?: string | string[] | null;
  diseaseCode?: string | string[] | null;
  diseaseName?: string | string[] | null;
  entryId?: string | string[] | null;
  imageUri?: string | string[] | null;
  createdAt?: string | string[] | null;
}): DiagnosisHistoryEntry | null {
  const diseaseCode = Array.isArray(params.diseaseCode) ? params.diseaseCode[0] : params.diseaseCode;
  const diseaseName = Array.isArray(params.diseaseName) ? params.diseaseName[0] : params.diseaseName;
  const imageUri = Array.isArray(params.imageUri) ? params.imageUri[0] : params.imageUri;
  if (!diseaseCode || !diseaseName || !imageUri) return null;

  return {
    boundingBox: { height: 34, left: 24, top: 22, width: 52 },
    confidence: parseConfidence(params.confidence),
    createdAt: formatDateTime(Array.isArray(params.createdAt) ? params.createdAt[0] : params.createdAt),
    diseaseCode: diseaseCode as DiagnosisHistoryEntry["diseaseCode"],
    diseaseName,
    id: Array.isArray(params.entryId) ? params.entryId[0] ?? `diagnosis-${Date.now()}` : params.entryId ?? `diagnosis-${Date.now()}`,
    imageUri,
  };
}

export function DurianDiagnosisResultScreen() {
  const navigation = useDurianSafeNavigation();
  const params = useLocalSearchParams<{
    confidence?: string | string[];
    createdAt?: string | string[];
    diseaseCode?: string | string[];
    diseaseName?: string | string[];
    entryId?: string | string[];
    imageUri?: string | string[];
  }>();
  const [entry, setEntry] = useState<DiagnosisHistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const fallbackEntry = useMemo(() => buildFallbackEntry(params), [params]);

  useEffect(() => {
    let active = true;

    async function loadEntry() {
      const entryId = Array.isArray(params.entryId) ? params.entryId[0] : params.entryId;
      if (entryId) {
        const saved = await getDiagnosisHistoryEntry(entryId);
        if (!active) return;
        setEntry(saved ?? fallbackEntry);
      } else {
        setEntry(fallbackEntry);
      }
      if (active) setLoading(false);
    }

    void loadEntry();

    return () => {
      active = false;
    };
  }, [fallbackEntry, params.entryId]);

  const detail = getDiagnosisDetail(entry?.diseaseCode ?? fallbackEntry?.diseaseCode ?? null);

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <DurianScreenHeader
          eyebrow="KẾT QUẢ CHẨN ĐOÁN"
          icon={Leaf}
          title="Đang tải kết quả..."
          subtitle="Chúng tôi đang ghép ảnh chẩn đoán với dữ liệu đã lưu."
        />
      </SafeAreaView>
    );
  }

  if (!entry || !detail) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <DurianScreenHeader
          eyebrow="KẾT QUẢ CHẨN ĐOÁN"
          icon={Leaf}
          title="Không có dữ liệu"
          subtitle="Không tìm thấy kết quả chẩn đoán để hiển thị."
        />
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Kết quả chưa sẵn sàng</Text>
          <Text style={styles.emptyText}>
            Hãy quét một lá bệnh mới hoặc mở từ lịch sử chẩn đoán để xem chi tiết.
          </Text>
          <Pressable
            onPress={() => navigation.replace("/diagnosis")}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>Về màn chẩn đoán</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.topBar}>
        <Pressable
          hitSlop={10}
          onPress={() => navigation.replace("/diagnosis-history")}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <ArrowLeft color={durianTheme.colors.mossDark} size={20} />
        </Pressable>
        <View style={styles.topBarCopy}>
          <Text style={styles.topBarEyebrow}>KẾT QUẢ CHẨN ĐOÁN</Text>
          <Text numberOfLines={1} style={styles.topBarTitle}>
            {entry.diseaseName}
          </Text>
        </View>
        <Pressable
          hitSlop={10}
          onPress={() => navigation.replace("/diagnosis")}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Search color={durianTheme.colors.mossDark} size={18} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Image source={{ uri: entry.imageUri }} resizeMode="cover" style={styles.heroImage} />
          <View style={styles.heroCopy}>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Clock3 color={durianTheme.colors.moss} size={12} />
                <Text style={styles.metaText}>{formatDateTime(entry.createdAt)}</Text>
              </View>
              <View style={styles.confidenceChip}>
                <Text style={styles.confidenceText}>{entry.confidence.toFixed(1)}%</Text>
              </View>
            </View>
            <Text style={styles.resultTitle}>{detail.name}</Text>
            <Text style={styles.resultSummary}>{detail.summary}</Text>
          </View>
        </View>

        <View style={styles.referenceCard}>
          <View style={styles.referenceHeader}>
            <View style={styles.referenceIcon}>
              <Info color={durianTheme.colors.moss} size={18} />
            </View>
            <View style={styles.referenceCopy}>
              <Text style={styles.referenceTitle}>Tóm tắt từ hệ thống</Text>
              <Text style={styles.referenceSubtitle}>
                Những phần hiển thị dưới đây được lấy từ catalog chẩn đoán cục bộ của ứng dụng.
              </Text>
            </View>
          </View>

          <View style={styles.sectionList}>
            {detail.sections.map((section) => (
              <View key={section.heading} style={styles.sectionCard}>
                <Text style={styles.sectionHeading}>{section.heading}</Text>
                {section.items.map((item) => (
                  <View key={item} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => navigation.replace("/diagnosis-history")}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Mở lịch sử</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.replace("/diagnosis")}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <RefreshCw color={durianTheme.colors.mossDark} size={16} />
            <Text style={styles.primaryButtonText}>Chẩn đoán mới</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", gap: 10 },
  backButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  bulletDot: {
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 4,
    height: 7,
    marginTop: 7,
    width: 7,
  },
  bulletRow: { alignItems: "flex-start", flexDirection: "row", gap: 9 },
  bulletText: {
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  confidenceChip: {
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  confidenceText: {
    color: durianTheme.colors.mossDark,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
  },
  content: { gap: 14, padding: 18, paddingBottom: 44 },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  emptyText: {
    color: durianTheme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyTitle: {
    color: durianTheme.colors.ink,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 24,
  },
  heroCard: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: "#E7E1D1",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  heroCopy: { gap: 10, padding: 16 },
  heroImage: { height: 240, width: "100%" },
  iconButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  metaChip: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    flexDirection: "row",
    gap: 5,
    minHeight: 30,
    paddingHorizontal: 10,
  },
  metaRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  metaText: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  primaryButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    height: 46,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: durianTheme.colors.mossDark,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  referenceCard: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 24,
    gap: 14,
    padding: 16,
  },
  referenceCopy: { flex: 1, gap: 4 },
  referenceHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  referenceIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  referenceSubtitle: {
    color: durianTheme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  referenceTitle: {
    color: durianTheme.colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
  resultSummary: {
    color: durianTheme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  resultTitle: {
    color: durianTheme.colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 29,
  },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  sectionCard: {
    backgroundColor: durianTheme.colors.canvas,
    borderColor: "#E3E8E1",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  sectionHeading: {
    color: durianTheme.colors.mossDark,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
    textTransform: "uppercase",
  },
  sectionList: { gap: 10 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#F7F9F4",
    borderColor: "#D9E3DB",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    height: 46,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: durianTheme.colors.moss,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  topBarCopy: { flex: 1 },
  topBarEyebrow: {
    color: durianTheme.colors.moss,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    lineHeight: 14,
  },
  topBarTitle: {
    color: durianTheme.colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
});
