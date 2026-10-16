import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Globe,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { durianTheme } from "@/src/theme/durianTheme";
import {
  runExportAssessment,
  type CriterionScore,
  type ExportAssessment,
  type RiskItem,
  type TargetMarket,
} from "@/src/lib/iotApi";

// ── Config ────────────────────────────────────────────────────────────────────

const DEVICE_ID = "esp32-01";

const MARKETS: { id: TargetMarket; flag: string; label: string }[] = [
  { id: "CHINA",    flag: "🇨🇳", label: "Trung Quốc (GACC)" },
  { id: "EU",       flag: "🇪🇺", label: "EU (GlobalGAP)" },
  { id: "US",       flag: "🇺🇸", label: "Hoa Kỳ (FDA)" },
  { id: "JAPAN",    flag: "🇯🇵", label: "Nhật Bản" },
  { id: "DOMESTIC", flag: "🇻🇳", label: "Nội địa (VietGAP)" },
];

function scoreColor(s: number) {
  return s >= 80 ? "#16a34a" : s >= 60 ? "#d97706" : "#dc2626";
}

function scoreLabel(s: number) {
  if (s >= 85) return "Đủ điều kiện xuất khẩu";
  if (s >= 70) return "Cần cải thiện nhỏ";
  if (s >= 50) return "Rủi ro cao — cần xử lý";
  return "Không đủ điều kiện";
}

// ── Gauge ─────────────────────────────────────────────────────────────────────

function GaugeChart({ score }: { score: number }) {
  const r = 52, cx = 62, cy = 62;
  const circ = 2 * Math.PI * r;
  const arc  = (score / 100) * circ;
  const col  = scoreColor(score);

  return (
    <Svg width={124} height={90} viewBox="0 0 124 90">
      <Circle cx={cx} cy={cx} r={r} fill="none" stroke={durianTheme.colors.mossSoft} strokeWidth={12}
        strokeDasharray={`${circ} ${circ}`} strokeLinecap="round" />
      <Circle cx={cx} cy={cx} r={r} fill="none" stroke={col} strokeWidth={12}
        strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`} />
    </Svg>
  );
}

// ── Criterion bar ──────────────────────────────────────────────────────────────

function CriterionRow({ c }: { c: CriterionScore }) {
  const col = scoreColor(c.score);
  return (
    <View style={styles.critRow}>
      <View style={styles.critLabelRow}>
        <Text style={styles.critLabel}>{c.label}</Text>
        <Text style={[styles.critScore, { color: col }]}>{c.score}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${c.score}%`, backgroundColor: col }]} />
      </View>
      <Text style={styles.critWeight}>Trọng số {c.weight}%</Text>
    </View>
  );
}

// ── Risk item ─────────────────────────────────────────────────────────────────

function RiskRow({ r }: { r: RiskItem }) {
  const col = r.severity === "CRITICAL" ? "#dc2626"
    : r.severity === "HIGH"   ? "#ea580c"
    : r.severity === "MEDIUM" ? "#d97706"
    : "#16a34a";

  return (
    <View style={[styles.riskRow, { borderLeftColor: col }]}>
      <View style={styles.riskHeader}>
        <Text style={styles.riskName}>{r.name}</Text>
        <View style={[styles.sevBadge, { backgroundColor: col + "22" }]}>
          <Text style={[styles.sevText, { color: col }]}>{r.severity}</Text>
        </View>
      </View>
      <Text style={styles.riskMsg}>{r.message}</Text>
      {r.phi_remaining > 0 && (
        <Text style={styles.riskMeta}>PHI còn {r.phi_remaining} ngày</Text>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function ExportComplianceScreen() {
  const [market,    setMarket]    = useState<TargetMarket>("CHINA");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [result,    setResult]    = useState<ExportAssessment | null>(null);
  const [showMkts,  setShowMkts]  = useState(false);

  const activeMarket = MARKETS.find((m) => m.id === market)!;

  const handleEvaluate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await runExportAssessment({
        device_id:     DEVICE_ID,
        target_market: market,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đánh giá thất bại.");
    } finally {
      setLoading(false);
    }
  }, [market]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DurianScreenHeader
          eyebrow="EXPORT COMPLIANCE · SMARTFARM"
          icon={BadgeCheck}
          title="Đánh giá Xuất khẩu"
          subtitle="Kiểm tra dư lượng MRL, thời gian cách ly và điểm sẵn sàng theo từng thị trường."
        />

        {/* Market selector */}
        <View style={styles.marketCard}>
          <Text style={styles.cardLabel}>Thị trường mục tiêu</Text>
          <Pressable style={styles.marketPicker} onPress={() => setShowMkts((v) => !v)}>
            <Text style={styles.marketFlag}>{activeMarket.flag}</Text>
            <Text style={styles.marketName}>{activeMarket.label}</Text>
            <ChevronDown color={durianTheme.colors.muted} size={16} />
          </Pressable>
          {showMkts && (
            <View style={styles.marketDropdown}>
              {MARKETS.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => { setMarket(m.id); setShowMkts(false); }}
                  style={[styles.marketOption, market === m.id && styles.marketOptionActive]}
                >
                  <Text style={styles.marketOptionFlag}>{m.flag}</Text>
                  <Text style={[styles.marketOptionLabel, market === m.id && { color: durianTheme.colors.moss }]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Evaluate button */}
        <Pressable
          onPress={handleEvaluate}
          disabled={loading}
          style={({ pressed }) => [styles.evalBtn, pressed && styles.pressed, loading && styles.disabled]}
        >
          {loading
            ? <><ActivityIndicator color="#fff" size={14} /><Text style={styles.evalBtnText}>Đang phân tích...</Text></>
            : <><TrendingUp color="#fff" size={16} /><Text style={styles.evalBtnText}>Đánh giá ngay</Text></>
          }
        </Pressable>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <AlertCircle color="#dc2626" size={15} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <View style={styles.emptyState}>
            <ShieldCheck color={durianTheme.colors.mist} size={40} />
            <Text style={styles.emptyTitle}>Chọn thị trường và nhấn "Đánh giá ngay"</Text>
            <Text style={styles.emptySubtitle}>Hệ thống tổng hợp dữ liệu IoT, lịch sử bệnh và tiêu chuẩn MRL để tính điểm xuất khẩu.</Text>
          </View>
        )}

        {/* Result */}
        {result && (
          <>
            {/* Score card */}
            <View style={styles.scoreCard}>
              <View style={styles.gaugeRow}>
                <View style={styles.gaugeWrapper}>
                  <GaugeChart score={result.overall_score} />
                  <Text style={[styles.gaugeScore, { color: scoreColor(result.overall_score) }]}>
                    {result.overall_score}%
                  </Text>
                </View>
                <View style={styles.scoreInfo}>
                  <Text style={styles.scoreLabel}>{scoreLabel(result.overall_score)}</Text>
                  <View style={styles.marketRow}>
                    <Globe color={durianTheme.colors.muted} size={12} />
                    <Text style={styles.marketRowText}>{result.market_label}</Text>
                  </View>
                  {result.days_until_harvest > 0 && (
                    <View style={styles.harvestPill}>
                      <Text style={styles.harvestText}>Còn {result.days_until_harvest} ngày</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Criteria */}
              <View style={styles.critSection}>
                <Text style={styles.sectionTitle}>Phân tích 5 tiêu chí</Text>
                {result.criteria.map((c) => <CriterionRow key={c.key} c={c} />)}
              </View>
            </View>

            {/* Risk list */}
            {result.risk_summary.length > 0 ? (
              <View style={styles.riskSection}>
                <Text style={styles.sectionTitle}>
                  Rủi ro dư lượng ({result.risk_summary.length})
                </Text>
                {result.risk_summary.map((r, i) => <RiskRow key={i} r={r} />)}
              </View>
            ) : (
              <View style={styles.safeBox}>
                <ShieldCheck color="#16a34a" size={16} />
                <Text style={styles.safeText}>Không phát hiện rủi ro dư lượng với thị trường này.</Text>
              </View>
            )}

            {/* Recommendations */}
            <View style={styles.recSection}>
              <Text style={styles.sectionTitle}>Khuyến nghị ({result.recommendations.length})</Text>
              {result.recommendations.map((rec, i) => {
                const col = rec.priority === "CRITICAL" ? "#dc2626"
                  : rec.priority === "HIGH" ? "#ea580c"
                  : rec.priority === "MEDIUM" ? "#d97706"
                  : "#16a34a";
                return (
                  <View key={i} style={styles.recRow}>
                    <View style={[styles.recPill, { backgroundColor: col }]}>
                      <Text style={styles.recPillText}>{rec.priority}</Text>
                    </View>
                    <Text style={styles.recText}>{rec.text}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:           { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  content:            { gap: 14, paddingBottom: 44, paddingHorizontal: 18 },
  cardLabel:          { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase" },
  sectionTitle:       { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900", marginBottom: 10 },

  // Market selector
  marketCard:         { backgroundColor: durianTheme.colors.surface, borderColor: "#ECE8D8", borderRadius: 20, borderWidth: 1, padding: 16 },
  marketPicker:       { alignItems: "center", flexDirection: "row", gap: 10 },
  marketFlag:         { fontSize: 22 },
  marketName:         { color: durianTheme.colors.ink, flex: 1, fontSize: 15, fontWeight: "800" },
  marketDropdown:     { borderColor: "#ECE8D8", borderRadius: 12, borderTopColor: "#ECE8D8", borderTopWidth: 1, marginTop: 12 },
  marketOption:       { alignItems: "center", flexDirection: "row", gap: 10, padding: 12 },
  marketOptionActive: { backgroundColor: durianTheme.colors.mossSoft, borderRadius: 10 },
  marketOptionFlag:   { fontSize: 18 },
  marketOptionLabel:  { color: durianTheme.colors.ink, fontSize: 13, fontWeight: "700" },

  // Eval button
  evalBtn:            { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 18, flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 14 },
  evalBtnText:        { color: "#fff", fontSize: 15, fontWeight: "900" },
  pressed:            { opacity: 0.8, transform: [{ scale: 0.97 }] },
  disabled:           { opacity: 0.6 },

  // Error
  errorBox:           { alignItems: "flex-start", backgroundColor: "#fef2f2", borderRadius: 14, flexDirection: "row", gap: 10, padding: 14 },
  errorText:          { color: "#dc2626", flex: 1, fontSize: 13 },

  // Empty
  emptyState:         { alignItems: "center", gap: 12, paddingVertical: 44 },
  emptyTitle:         { color: durianTheme.colors.ink, fontSize: 15, fontWeight: "800", textAlign: "center" },
  emptySubtitle:      { color: durianTheme.colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center" },

  // Score card
  scoreCard:          { backgroundColor: durianTheme.colors.surface, borderColor: "#ECE8D8", borderRadius: 22, borderWidth: 1, overflow: "hidden" },
  gaugeRow:           { alignItems: "center", backgroundColor: durianTheme.colors.canvas, borderBottomColor: "#ECE8D8", borderBottomWidth: 1, flexDirection: "row", gap: 16, padding: 18 },
  gaugeWrapper:       { alignItems: "center", position: "relative" },
  gaugeScore:         { bottom: 16, fontSize: 24, fontWeight: "900", position: "absolute", textAlign: "center", width: "100%" },
  scoreInfo:          { flex: 1, gap: 6 },
  scoreLabel:         { color: durianTheme.colors.ink, fontSize: 16, fontWeight: "900" },
  marketRow:          { alignItems: "center", flexDirection: "row", gap: 5 },
  marketRowText:      { color: durianTheme.colors.muted, fontSize: 12 },
  harvestPill:        { alignSelf: "flex-start", backgroundColor: durianTheme.colors.mossSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  harvestText:        { color: durianTheme.colors.moss, fontSize: 11, fontWeight: "800" },

  // Criteria
  critSection:        { padding: 16, gap: 12 },
  critRow:            { gap: 4 },
  critLabelRow:       { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  critLabel:          { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "700" },
  critScore:          { fontSize: 12, fontWeight: "900" },
  critWeight:         { color: durianTheme.colors.mist, fontSize: 9 },
  barTrack:           { backgroundColor: durianTheme.colors.mossSoft, borderRadius: 4, height: 7, overflow: "hidden" },
  barFill:            { borderRadius: 4, height: "100%" },

  // Risks
  riskSection:        { gap: 8 },
  riskRow:            { backgroundColor: durianTheme.colors.surface, borderLeftWidth: 3, borderRadius: 14, borderWidth: 1, borderColor: "#ECE8D8", gap: 4, padding: 14 },
  riskHeader:         { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  riskName:           { color: durianTheme.colors.ink, flex: 1, fontSize: 13, fontWeight: "800" },
  sevBadge:           { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  sevText:            { fontSize: 10, fontWeight: "900" },
  riskMsg:            { color: durianTheme.colors.muted, fontSize: 12, lineHeight: 17 },
  riskMeta:           { color: durianTheme.colors.muted, fontSize: 10 },

  // Safe box
  safeBox:            { alignItems: "center", backgroundColor: "#f0fdf4", borderColor: "#bbf7d0", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, padding: 14 },
  safeText:           { color: "#15803d", flex: 1, fontSize: 13 },

  // Recommendations
  recSection:         { gap: 8 },
  recRow:             { backgroundColor: durianTheme.colors.surface, borderColor: "#ECE8D8", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, padding: 14, alignItems: "flex-start" },
  recPill:            { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  recPillText:        { color: "#fff", fontSize: 9, fontWeight: "900" },
  recText:            { color: durianTheme.colors.muted, flex: 1, fontSize: 12, lineHeight: 18 },
});
