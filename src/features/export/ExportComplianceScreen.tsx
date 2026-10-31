import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BadgeCheck } from "lucide-react-native";
import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";
import { assessExportRelease, listExportReleases, listHarvestBatches } from "../cultivation/api/cultivationApi";
import type { ComplianceAssessment, ExportRelease, HarvestBatch } from "../cultivation/api/cultivationTypes";
import { exportReleaseStatusLabels, harvestBatchStatusLabels, riskLevelLabels } from "../cultivation/api/cultivationLabels";
import { cultivationError } from "../cultivation/api/cultivationError";
import { getCultivationRevision, subscribeCultivation } from "../cultivation/api/cultivationRefresh";
import { residueDate, residueReason } from "../cultivation/api/residueRisk";
import { ResidueRiskPanel } from "../cultivation/ResidueRiskPanel";

const complianceReasons: Record<string, string> = {
  PRE_HARVEST_INTERVAL_NOT_MET: "Chưa đủ thời gian cách ly trước thu hoạch.",
  MAXIMUM_DOSE_EXCEEDED: "Liều sử dụng vượt giới hạn được cấu hình.",
  MISSING_EXECUTION_RECORD: "Thiếu nhật ký thực hiện.",
  LAB_TEST_REQUIRED: "Cần có kết quả xét nghiệm.",
  LAB_RESULT_PENDING: "Kết quả xét nghiệm chưa đầy đủ hoặc cần kiểm tra.",
  LAB_EVIDENCE_UNVERIFIED: "Chưa xác minh được dữ liệu xét nghiệm.",
  HARVEST_BATCH_NOT_ELIGIBLE: "Trạng thái lô thu hoạch chưa đủ điều kiện.",
  UNAPPROVED_CHEMICAL_APPLICATION: "Có công việc dùng hóa chất chưa được duyệt.",
  LAB_NOT_ASSESSED: "Chưa có kết quả xét nghiệm phù hợp để đánh giá lô này.",
  MISSING_BATCH_NUMBER: "Có vật tư chưa ghi số lô sản phẩm.",
};

export function ExportComplianceScreen() {
  const { session } = useSession();
  const revision = useSyncExternalStore(subscribeCultivation, getCultivationRevision, getCultivationRevision);
  const [batches, setBatches] = useState<HarvestBatch[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let current = true;
    setLoading(true); setError(null); setBatches([]);
    listHarvestBatches().then(items => {
      if (!current) return;
      setBatches(items);
      setSelectedId(id => items.some(item => item.id === id) ? id : items[0]?.id ?? "");
    }).catch(caught => { if (current) setError(cultivationError(caught)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [session?.user.id, revision, retry]));
  const selected = batches.find(batch => batch.id === selectedId);
  return <SafeAreaView style={styles.safe} edges={["top"]}>
    <ScrollView contentContainerStyle={styles.content}>
      <DurianScreenHeader eyebrow="TUÂN THỦ XUẤT KHẨU" icon={BadgeCheck} title="Đánh giá xuất khẩu"
        subtitle="Theo lô thu hoạch, nhật ký vật tư và kết quả xét nghiệm đã ghi nhận." />
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)}><Text style={styles.link}>Tải lại dữ liệu</Text></Pressable>
      {!loading && !error && !batches.length ? <Text style={styles.note}>Chưa có lô thu hoạch được phép truy cập. Tạo lô thu hoạch thực tế trong quy trình canh tác để đánh giá.</Text> : null}
      {batches.map(batch => <Pressable accessibilityRole="button" accessibilityState={{ selected: batch.id === selectedId }} key={batch.id}
        onPress={() => setSelectedId(batch.id)} style={[styles.card, batch.id === selectedId && styles.selected]}>
        <Text style={styles.title}>{batch.batchCode}</Text>
        <Text style={styles.note}>{harvestBatchStatusLabels[batch.status]} · {batch.expectedDestinationMarket}</Text>
      </Pressable>)}
      {selected ? <BatchCompliance key={`${session?.user.id}:${selected.id}`} batch={selected} revision={revision} /> : null}
    </ScrollView>
  </SafeAreaView>;
}

function BatchCompliance({ batch, revision }: { batch: HarvestBatch; revision: number }) {
  const [assessment, setAssessment] = useState<ComplianceAssessment | null>(null);
  const [releases, setReleases] = useState<ExportRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setAssessment(null); setReleases([]); setLoading(true); setError(null);
    Promise.all([assessExportRelease(batch.id, batch.expectedDestinationMarket), listExportReleases({ harvestBatchId: batch.id })])
      .then(([result, rows]) => { if (current) { setAssessment(result); setReleases(rows); } })
      .catch(caught => { if (current) setError(cultivationError(caught)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [batch, revision, retry]);
  return <>
    <View style={styles.card}>
      <Text style={styles.title}>Đánh giá lô {batch.batchCode}</Text>
      <Text style={styles.note}>Thu hoạch: {residueDate(batch.harvestedAt)} · Thị trường: {batch.expectedDestinationMarket}</Text>
      {loading ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={loading} onPress={() => setRetry(value => value + 1)}><Text style={styles.link}>Đánh giá lại</Text></Pressable>
      {assessment ? <>
        <Text style={styles.title}>{assessment.eligibleForExportRelease ? "Đủ điều kiện theo đánh giá hiện tại" : "Chưa đủ điều kiện phát hành xuất khẩu"}</Text>
        <Text style={styles.note}>Mức rủi ro tuân thủ: {riskLevelLabels[assessment.riskLevel]}</Text>
        <Text style={styles.note}>Ngày an toàn theo PHI: {residueDate(assessment.earliestSafeHarvestDate ?? null)}</Text>
        <Text style={styles.note}>Đánh giá lúc: {new Date(assessment.assessedAt).toLocaleString("vi-VN")}</Text>
        {[...new Set([...assessment.blockingReasons, ...assessment.warnings])].map(reason => <Text key={reason} style={styles.note}>{complianceReasons[reason] ?? residueReason(reason)}</Text>)}
        <Text style={styles.note}>Đánh giá tuân thủ không phải kết quả đo dư lượng. PASS/FAIL của xét nghiệm chỉ xuất hiện khi có dữ liệu phòng kiểm nghiệm.</Text>
      </> : null}
    </View>
    <View style={styles.card}>
      <Text style={styles.title}>Hồ sơ xuất khẩu</Text>
      {!loading && !error && !releases.length ? <Text style={styles.note}>Chưa có hồ sơ xuất khẩu cho lô này.</Text> : null}
      {releases.map(release => <Text key={release.id} style={styles.note}>{release.releaseCode} · {exportReleaseStatusLabels[release.status]}</Text>)}
    </View>
    <Text style={styles.note}>Tổng quan bên dưới áp dụng cho mùa vụ và khu canh tác của lô đang chọn; kết quả xét nghiệm có thể thuộc các lô khác trong cùng mùa vụ.</Text>
    <ResidueRiskPanel seasonId={batch.cultivationSeasonId} plotId={batch.plotId} revision={`${revision}:${retry}`} />
  </>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: durianTheme.colors.canvas },
  content: { padding: 18, paddingBottom: 44, gap: 14 },
  card: { backgroundColor: "white", padding: 16, gap: 10, borderRadius: 16, borderWidth: 1, borderColor: durianTheme.colors.mossSoft },
  selected: { borderColor: durianTheme.colors.moss, borderWidth: 2 },
  title: { color: durianTheme.colors.ink, fontWeight: "800", fontSize: 15 },
  note: { color: durianTheme.colors.muted, fontSize: 13, lineHeight: 20 },
  link: { color: durianTheme.colors.moss, fontWeight: "700", paddingVertical: 10 },
  error: { color: "#b91c1c", fontSize: 13, lineHeight: 20 },
});
