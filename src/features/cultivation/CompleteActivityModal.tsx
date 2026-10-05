import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listAgriculturalInputs } from "./api/cultivationApi";
import type { AgriculturalInput, CompleteCultivationActivityRequest, CultivationActivity } from "./api/cultivationTypes";
import { activityTypeLabels } from "./api/cultivationLabels";
import { buildCompletionPayload, emptyUsage, requiresRecordedInput, type CompletionDraft } from "./api/activityCompletion";
import { durianTheme } from "@/src/theme/durianTheme";

const localNow = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function CompleteActivityModal({ activity, actorId, actorName, onClose, onSubmit }: {
  activity: CultivationActivity | null;
  actorId: string;
  actorName: string;
  onClose: () => void;
  onSubmit: (id: string, payload: CompleteCultivationActivityRequest) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CompletionDraft>({ startedAt: "", completedAt: "", actualArea: "", areaUnit: "ha", notes: "", inputUsages: [] });
  const [catalog, setCatalog] = useState<AgriculturalInput[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!activity) return;
    let active = true;
    const now = localNow();
    setDraft({ startedAt: now, completedAt: now, actualArea: "", areaUnit: "ha", notes: "", inputUsages: requiresRecordedInput(activity.activityType) ? [emptyUsage()] : [] });
    setCatalog([]); setCatalogError(false); setFormError(""); setCatalogLoading(true);
    listAgriculturalInputs({ status: "VERIFIED" })
      .then((items) => { if (active) setCatalog(items.filter((item) => item.status === "VERIFIED")); })
      .catch(() => { if (active) setCatalogError(true); })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [activity]);
  const byId = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);
  if (!activity) return null;
  const updateUsage = (index: number, changes: Partial<CompletionDraft["inputUsages"][number]>) =>
    setDraft((current) => ({ ...current, inputUsages: current.inputUsages.map((usage, position) => position === index ? { ...usage, ...changes } : usage) }));
  const submit = async () => {
    setFormError("");
    try {
      if (catalogError) throw new Error("Không thể tải danh mục vật tư.");
      const payload = buildCompletionPayload(activity.activityType, draft, catalog, actorId);
      setSubmitting(true);
      await onSubmit(activity.id, payload);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể hoàn thành công việc.");
    } finally { setSubmitting(false); }
  };
  const field = (label: string, value: string, onChange: (value: string) => void, numeric = false) =>
    <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput keyboardType={numeric ? "decimal-pad" : "default"} onChangeText={onChange} style={styles.input} value={value} /></View>;
  return <Modal animationType="slide" onRequestClose={onClose} visible><SafeAreaView style={styles.safe}><View style={styles.header}><Text style={styles.title}>Hoàn thành công việc</Text><Pressable disabled={submitting} onPress={onClose}><Text style={styles.link}>Đóng</Text></Pressable></View><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.subtitle}>{activity.title} · {activityTypeLabels[activity.activityType]}</Text>
    <Text style={styles.section}>Thông tin thực hiện</Text>
    {field("Bắt đầu (YYYY-MM-DDTHH:mm)", draft.startedAt, (startedAt) => setDraft({ ...draft, startedAt }))}
    {field("Hoàn thành (YYYY-MM-DDTHH:mm)", draft.completedAt, (completedAt) => setDraft({ ...draft, completedAt }))}
    <Text style={styles.label}>Người thực hiện: {actorName || actorId}</Text>
    {field("Diện tích thực hiện", draft.actualArea, (actualArea) => setDraft({ ...draft, actualArea }), true)}
    {field("Đơn vị diện tích", draft.areaUnit, (areaUnit) => setDraft({ ...draft, areaUnit }))}
    {field("Ghi chú", draft.notes, (notes) => setDraft({ ...draft, notes }))}
    <View style={styles.row}><Text style={styles.section}>Vật tư đã sử dụng {requiresRecordedInput(activity.activityType) ? "*" : ""}</Text><Pressable onPress={() => setDraft({ ...draft, inputUsages: [...draft.inputUsages, emptyUsage()] })}><Text style={styles.link}>+ Thêm</Text></Pressable></View>
    {catalogLoading ? <ActivityIndicator color={durianTheme.colors.moss} /> : catalogError ? <Text style={styles.error}>Không thể tải danh mục vật tư.</Text> : catalog.length === 0 ? <Text>Chưa có vật tư trong danh mục.</Text> : null}
    {draft.inputUsages.map((usage, index) => { const input = byId.get(usage.agriculturalInputId); return <View key={index} style={styles.usage}>
      <Text style={styles.label}>Sản phẩm</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.row}>{catalog.map((item) => <Pressable key={item.id} onPress={() => updateUsage(index, { agriculturalInputId: item.id, quantityUnit: item.unit ?? "" })} style={[styles.chip, usage.agriculturalInputId === item.id && styles.chipActive]}><Text style={usage.agriculturalInputId === item.id ? styles.chipTextActive : styles.chipText}>{item.tradeName || item.productName}</Text></Pressable>)}</View></ScrollView>
      {input ? <Text style={styles.context}>Loại: {input.category} · Nhà sản xuất: {input.manufacturer || "—"} · Số đăng ký: {input.registrationNumber || "—"}{"\n"}Hoạt chất: {input.activeIngredients?.map((ingredient) => ingredient.name).join(", ") || "—"} · PHI: {input.preHarvestIntervalDays ?? "—"} ngày · Liều khuyến nghị: {input.recommendedDose || "—"}</Text> : null}
      {field("Số lượng", usage.quantityUsed, (quantityUsed) => updateUsage(index, { quantityUsed }), true)}
      {field("Đơn vị", usage.quantityUnit, (quantityUnit) => updateUsage(index, { quantityUnit }))}
      {field("Batch/Lot", usage.batchNumber, (batchNumber) => updateUsage(index, { batchNumber }))}
      <Pressable onPress={() => setDraft({ ...draft, inputUsages: draft.inputUsages.filter((_, position) => position !== index) })}><Text style={styles.remove}>Xóa dòng</Text></Pressable>
    </View>; })}
    {formError ? <Text style={styles.error}>{formError}</Text> : null}
    <Pressable disabled={submitting || catalogLoading || catalogError} onPress={() => void submit()} style={[styles.submit, (submitting || catalogLoading || catalogError) && styles.disabled]}><Text style={styles.submitText}>{submitting ? "Đang lưu..." : "Ghi hoàn thành"}</Text></Pressable>
  </ScrollView></SafeAreaView></Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: durianTheme.colors.surface }, header: { flexDirection: "row", justifyContent: "space-between", padding: 18 }, title: { color: durianTheme.colors.ink, fontSize: 18, fontWeight: "900" }, link: { color: durianTheme.colors.moss, fontWeight: "900" }, content: { gap: 14, padding: 18, paddingBottom: 40 }, subtitle: { color: durianTheme.colors.muted }, section: { color: durianTheme.colors.ink, fontSize: 15, fontWeight: "900" }, field: { gap: 5 }, label: { color: durianTheme.colors.ink, fontSize: 12, fontWeight: "800" }, input: { borderColor: durianTheme.colors.mossSoft, borderRadius: 10, borderWidth: 1, color: durianTheme.colors.ink, padding: 12 }, row: { flexDirection: "row", gap: 8, alignItems: "center" }, usage: { borderColor: durianTheme.colors.mossSoft, borderRadius: 12, borderWidth: 1, gap: 10, padding: 12 }, chip: { borderColor: durianTheme.colors.mossSoft, borderRadius: 20, borderWidth: 1, padding: 9 }, chipActive: { backgroundColor: durianTheme.colors.moss }, chipText: { color: durianTheme.colors.moss }, chipTextActive: { color: durianTheme.colors.white }, context: { color: durianTheme.colors.muted, fontSize: 12, lineHeight: 19 }, remove: { color: durianTheme.colors.danger, fontWeight: "800" }, error: { color: durianTheme.colors.danger }, submit: { backgroundColor: durianTheme.colors.moss, borderRadius: 12, padding: 14, alignItems: "center" }, submitText: { color: durianTheme.colors.white, fontWeight: "900" }, disabled: { opacity: 0.5 },
});
