import { ArrowLeft, CalendarDays, Clock3, ExternalLink, Info, Leaf, RefreshCw, Search, Send } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { DurianRemoteImage } from "@/src/components/DurianRemoteImage";
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

function textItems(items?: Array<{ text: string }> | null) {
  return (items ?? []).map((item) => item.text).filter(Boolean);
}

function treatmentItems(items?: Array<{ treatmentText: string }> | null) {
  return (items ?? []).map((item) => item.treatmentText).filter(Boolean);
}

function buildBackendSections(entry: DiagnosisHistoryEntry) {
  const recommendation = entry.recommendation;
  const decisionSupport = entry.decisionSupport;
  const sections = [
    {
      heading: "Tổng quan",
      items: [recommendation?.diseaseSummary].filter((item): item is string => Boolean(item)),
    },
    { heading: "Triệu chứng", items: textItems(recommendation?.symptoms) },
    { heading: "Nguyên nhân", items: textItems(recommendation?.causes) },
    { heading: "Phòng ngừa", items: textItems(recommendation?.prevention) },
    { heading: "Sinh học", items: textItems(recommendation?.biologicalTreatments) },
    { heading: "Hữu cơ", items: textItems(recommendation?.organicTreatments) },
    { heading: "Hóa học", items: treatmentItems(recommendation?.chemicalTreatments) },
    { heading: "Điều kiện thuận lợi", items: [recommendation?.favorableConditions].filter((item): item is string => Boolean(item)) },
    { heading: "Yêu cầu xuất khẩu", items: (recommendation?.exportConsiderations ?? []).map((item) => item.requirementText).filter(Boolean) },
    { heading: "Việc cần làm ngay", items: decisionSupport?.immediateActions ?? [] },
    { heading: "Theo dõi", items: decisionSupport?.monitoringPlan ?? [] },
    { heading: "Kế hoạch sinh học", items: decisionSupport?.biologicalPlan ?? [] },
    { heading: "Kế hoạch hữu cơ", items: decisionSupport?.organicPlan ?? [] },
    { heading: "Kế hoạch hóa học", items: decisionSupport?.chemicalPlan ?? [] },
    { heading: "Sẵn sàng xuất khẩu", items: decisionSupport?.exportReadiness ?? [] },
    { heading: "Lưu ý cho nông hộ", items: decisionSupport?.farmerNotes ?? [] },
  ];

  return sections.filter((section) => section.items.length > 0);
}

function sourceLabel(value?: DiagnosisHistoryEntry["source"]) {
  if (value === "IOT_CAMERA") return "Camera IoT";
  if (value === "WEB") return "Web";
  if (value === "MOBILE") return "Di động";
  return "Chưa có";
}

function buildDiagnosisShareMessage(entry: DiagnosisHistoryEntry, summary: string) {
  const actions = entry.decisionSupport?.immediateActions?.slice(0, 3) ?? [];
  const monitoring = entry.decisionSupport?.monitoringPlan?.slice(0, 2) ?? [];
  const chemical = treatmentItems(entry.recommendation?.chemicalTreatments).slice(0, 2);
  const imageLine =
    entry.imageUri && /^https?:\/\//i.test(entry.imageUri)
      ? [`Ảnh chẩn đoán: ${entry.imageUri}`]
      : [];
  const actionLines = actions.length
    ? ["Việc cần làm ngay:", ...actions.map((item) => `- ${item}`)]
    : [];
  const monitoringLines = monitoring.length
    ? ["Theo dõi:", ...monitoring.map((item) => `- ${item}`)]
    : [];
  const treatmentLines = chemical.length
    ? ["Gợi ý xử lý:", ...chemical.map((item) => `- ${item}`)]
    : [];

  return [
    "Nhờ kỹ sư xem giúp báo cáo chẩn đoán AI.",
    `Bệnh: ${entry.diseaseName}`,
    `Độ tin cậy: ${entry.confidenceText ?? `${entry.confidence.toFixed(1)}%`}`,
    `Mã dự đoán: ${entry.predictedDisease ?? entry.diseaseCode}`,
    entry.severity ? `Mức độ: ${entry.severity}` : null,
    `Tóm tắt: ${summary}`,
    ...actionLines,
    ...monitoringLines,
    ...treatmentLines,
    ...imageLine,
    `Mã báo cáo: ${entry.id}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
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
  const backendSections = entry ? buildBackendSections(entry) : [];
  const displaySections = backendSections.length > 0 ? backendSections : detail?.sections ?? [];
  const displaySummary =
    entry?.recommendation?.diseaseSummary ??
    detail?.summary ??
    "Backend chưa trả phần mô tả cho kết quả này.";

  function shareToEngineer() {
    if (!entry) return;
    const shareText = buildDiagnosisShareMessage(entry, displaySummary);
    navigation.push(`/(main)/chat?shareText=${encodeURIComponent(shareText)}`);
  }

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

  if (!entry) {
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
          {entry.imageUri ? (
            <DurianRemoteImage
              feature="diagnosis-result-image"
              uri={entry.imageUri}
              resizeMode="cover"
              style={styles.heroImage}
            />
          ) : (
            <View style={[styles.heroImage, styles.noImage]}>
              <Leaf color={durianTheme.colors.moss} size={32} />
              <Text style={styles.noImageText}>Backend chưa trả ảnh chẩn đoán.</Text>
            </View>
          )}
          <View style={styles.heroCopy}>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Clock3 color={durianTheme.colors.moss} size={12} />
                <Text style={styles.metaText}>{formatDateTime(entry.createdAt)}</Text>
              </View>
              <View style={styles.confidenceChip}>
                <Text style={styles.confidenceText}>{entry.confidenceText ?? `${entry.confidence.toFixed(1)}%`}</Text>
              </View>
            </View>
            <Text style={styles.resultTitle}>{entry.diseaseName}</Text>
            <Text style={styles.resultSummary}>{displaySummary}</Text>
            <Text style={styles.metaLine}>Mã dự đoán: {entry.predictedDisease ?? entry.diseaseCode}</Text>
            {entry.severity ? <Text style={styles.metaLine}>Mức độ: {entry.severity}</Text> : null}
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
                Ưu tiên recommendation và decision support thật từ backend AI; catalog cục bộ chỉ dùng khi backend không trả phần này.
              </Text>
            </View>
          </View>

          <View style={styles.sectionList}>
            {displaySections.map((section) => (
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
          <View style={styles.metaGrid}>
            <MetaInfo label="Nguồn ảnh" value={sourceLabel(entry.source)} />
            <MetaInfo label="Phát hiện vùng lá" value={entry.usedDetectionCrop ? "Có crop phát hiện" : "Ảnh toàn khung"} />
            {entry.deviceId ? <MetaInfo label="Thiết bị IoT" value={entry.deviceId} /> : null}
            {entry.originalFilename ? <MetaInfo label="Tệp gốc" value={entry.originalFilename} /> : null}
          </View>
          {entry.topPredictions?.length ? <View style={styles.sectionCard}><Text style={styles.sectionHeading}>Các dự đoán hàng đầu</Text>{entry.topPredictions.map((prediction) => <View key={prediction.label} style={styles.bulletRow}><View style={styles.bulletDot} /><Text style={styles.bulletText}>{prediction.label} · {prediction.confidence.toFixed(2)}%</Text></View>)}</View> : null}
          {entry.recommendation?.references?.length ? <View style={styles.sectionCard}><Text style={styles.sectionHeading}>Nguồn tham khảo</Text>{entry.recommendation.references.map((reference, index) => { const label = reference.sourceName || reference.publicationTitle || "Tài liệu tham khảo"; return <Pressable disabled={!reference.url} key={`${label}-${index}`} onPress={() => reference.url ? void Linking.openURL(reference.url) : undefined} style={styles.referenceLink}><ExternalLink color={durianTheme.colors.moss} size={15} /><Text style={styles.referenceLinkText}>{label}</Text></Pressable>; })}</View> : null}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={shareToEngineer}
            style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
          >
            <Send color={durianTheme.colors.mossDark} size={16} />
            <Text style={styles.primaryButtonText}>Gửi kỹ sư</Text>
          </Pressable>
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

function MetaInfo({ label, value }: { label: string; value: string }) {
  return <View style={styles.metaInfo}><Text style={styles.metaInfoLabel}>{label}</Text><Text style={styles.metaInfoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
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
  content: { gap: durianTheme.spacing.lg, padding: durianTheme.spacing.xl, paddingBottom: 44 },
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
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
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
  metaLine: {
    color: durianTheme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaInfo: { backgroundColor: durianTheme.colors.surfaceSecondary, borderRadius: durianTheme.radius.sm, flexGrow: 1, minWidth: "45%", padding: 10 },
  metaInfoLabel: { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "800" },
  metaInfoValue: { color: durianTheme.colors.ink, fontSize: 12, fontWeight: "900", marginTop: 3 },
  noImage: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    gap: 8,
    justifyContent: "center",
  },
  noImageText: {
    color: durianTheme.colors.moss,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 18,
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
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
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
  referenceLink: { alignItems: "center", flexDirection: "row", gap: 7, paddingVertical: 4 },
  referenceLinkText: { color: durianTheme.colors.moss, flex: 1, fontSize: 13, fontWeight: "800", lineHeight: 19 },
  shareButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: durianTheme.radius.sm,
    flexDirection: "row",
    gap: 8,
    height: 46,
    justifyContent: "center",
    paddingHorizontal: 16,
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
