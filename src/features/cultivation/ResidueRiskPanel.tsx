import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { getResidueRisk } from "./api/cultivationApi";
import { ingredientPresentation, labPresentation, residueDate, residueReason, riskPresentation,
  type ResidueRiskIngredient, type ResidueRiskResponse } from "./api/residueRisk";
import { durianTheme } from "@/src/theme/durianTheme";
import { cultivationError } from "./api/cultivationError";

export function ResidueRiskPanel({ seasonId, plotId, revision }: {
  seasonId: string; plotId: string; revision: unknown;
}) {
  const [data, setData] = useState<ResidueRiskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setData(null);
    setError(null);
    setLoading(Boolean(seasonId));
    if (seasonId) {
      getResidueRisk(seasonId, plotId).then(result => {
        if (current) setData(result);
      }).catch(caught => { if (current) setError(cultivationError(caught, "Không thể tải tổng quan dư lượng.")); })
        .finally(() => { if (current) setLoading(false); });
    }
    return () => { current = false; };
  }, [seasonId, plotId, revision, retry]);
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Nguy cơ dư lượng</Text>
      <Text style={styles.note}>Đánh giá từ lịch sử sử dụng và thời gian cách ly. Kết quả xét nghiệm được trình bày riêng.</Text>
      {!seasonId ? <Text style={styles.note}>Chọn mùa vụ để xem tổng quan.</Text> : null}
      {loading ? <ActivityIndicator accessibilityLabel="Đang tải nguy cơ dư lượng" /> : null}
      {error ? <View style={styles.stack}>
        <Text style={styles.note}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)}><Text style={styles.link}>Thử lại</Text></Pressable>
      </View> : null}
      {data ? <>
        <Text style={[styles.title, { color: riskPresentation[data.overallRisk].color }]}>Tổng quan: {riskPresentation[data.overallRisk].label}</Text>
        <Text style={styles.text}>Thu hoạch dự kiến: {residueDate(data.expectedHarvestDate)}</Text>
        {data.expectedHarvestDate ? <Text style={styles.note}>Ngày sớm nhất trong các kế hoạch chưa bị hủy.</Text> : null}
        <Text style={styles.note}>Thị trường đối chiếu: {data.targetMarketCodes.join(", ") || "Chưa có"}</Text>
        {data.riskReasons.map(reason => <Text key={reason} style={styles.note}>{residueReason(reason)}</Text>)}
        {data.ingredients.map(ingredient => <IngredientCard key={ingredient.key} ingredient={ingredient} />)}
      </> : null}
    </View>
  );
}

function IngredientCard({ ingredient }: { ingredient: ResidueRiskIngredient }) {
  const [expanded, setExpanded] = useState(false);
  const view = ingredientPresentation(ingredient);
  return <View style={styles.card}>
    <Text style={styles.title}>{ingredient.name}</Text>
    <Text style={[styles.text, { color: view.risk.color }]}>Nguy cơ: {view.risk.label}</Text>
    <Text style={styles.text}>{ingredient.applicationCount} lần áp dụng · Lần cuối: {residueDate(ingredient.lastUsedAt)}</Text>
    <Text style={styles.note}>Sản phẩm: {ingredient.products.join(", ")}</Text>
    <Text style={styles.text}>Ngày an toàn theo PHI: {residueDate(ingredient.latestSafeHarvestDate)}</Text>
    <Text style={styles.text}>Thu hoạch dự kiến: {residueDate(ingredient.expectedHarvestDate)}</Text>
    {view.reasons.map((reason, index) => <Text key={index} style={styles.note}>{reason}</Text>)}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}>
      <Text style={styles.link}>{expanded ? "Ẩn lịch sử sử dụng" : "Xem lịch sử sử dụng"}</Text>
    </Pressable>
    {expanded ? view.timeline.map(row => <View key={row.key} style={styles.timeline}>
      <Text style={styles.note}>{row.date}</Text><Text style={styles.text}>{row.product} · {row.quantity}</Text>
    </View>) : null}
    <View style={styles.lab}>
      <Text style={styles.subtitle}>Kết quả xét nghiệm</Text>
      {view.noLab ? <Text style={styles.note}>{view.noLab}</Text> : ingredient.labAssessment.results.map(lab => {
        const display = labPresentation(lab);
        return <View key={lab.resultId} style={styles.stack}>
          <Text style={styles.note}>Mẫu {lab.sampleId} · {residueDate(lab.sampledAt)} · {lab.targetMarketCode || "Chưa rõ thị trường"}</Text>
          <Text style={styles.note}>Lô thu hoạch: {lab.harvestBatchId || "Chưa xác định"}</Text>
          <Text style={styles.text}>Đo được: {display.measured} · MRL: {display.mrl}</Text>
          <Text style={[styles.subtitle, { color: display.color }]}>{display.label}</Text>
          {lab.predatesLastUsage ? <Text style={styles.note}>Mẫu được lấy trước lần sử dụng gần nhất; chưa phản ánh lần dùng mới.</Text> : null}
        </View>;
      })}
      <Text style={styles.note}>Kết quả thuộc từng mẫu xét nghiệm, không thay thế đánh giá điều kiện xuất khẩu.</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  panel: { padding: 16, gap: 12, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: durianTheme.colors.mossSoft },
  card: { padding: 13, gap: 8, borderRadius: 12, backgroundColor: durianTheme.colors.canvas, borderWidth: 1, borderColor: durianTheme.colors.mossSoft },
  title: { fontSize: 16, fontWeight: "800", color: durianTheme.colors.ink },
  subtitle: { fontSize: 13, fontWeight: "700", color: durianTheme.colors.ink },
  text: { fontSize: 13, lineHeight: 20, color: durianTheme.colors.ink },
  note: { fontSize: 12, lineHeight: 18, color: durianTheme.colors.muted },
  link: { paddingVertical: 8, color: durianTheme.colors.moss, fontWeight: "700" },
  timeline: { paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: durianTheme.colors.mossSoft, gap: 3 },
  lab: { borderTopWidth: 1, borderColor: durianTheme.colors.mossSoft, paddingTop: 12, marginTop: 4, gap: 10 },
  stack: { gap: 5 },
});
