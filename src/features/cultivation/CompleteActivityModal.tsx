import { useEffect, useMemo, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { CodeScannerCamera } from "../qr-scanner/CodeScannerCamera";
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createUserRecordedAgriculturalInput, listAgriculturalInputs } from "./api/cultivationApi";
import type { AgriculturalInput, CompleteCultivationActivityRequest, CultivationActivity, MaterialRecordSource } from "./api/cultivationTypes";
import { activityTypeLabels } from "./api/cultivationLabels";
import { addSelectedMaterial, buildCompletionPayload, canRecordUsage, requiresRecordedInput, type CompletionDraft } from "./api/activityCompletion";
import type { RecentMaterial } from "./api/historyRecords";
import { materialRecognitionError, recognizeMaterialLabel } from "./api/materialRecognitionApi";
import { createRecognitionReviewDraft, resolveExistingMaterial, userRecordedMaterialRequest, type MaterialSelectionSource, type RecognitionReviewDraft } from "./api/materialRecognition";
import { materialCodeFromScan, selectWithOptionalCodeMapping, type ScannedMaterialCode } from "./api/materialCode";
import { resolveMaterialCode, saveMaterialCodeMapping } from "./api/materialCodeApi";
import { durianTheme } from "@/src/theme/durianTheme";
import { cultivationError } from "./api/cultivationError";

const localNow = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

type RecognitionPhase = "idle" | "loading" | "review" | "error" | "unknown" | "scanner" | "scanLoading" | "scanFound" | "scanUnknown" | "scanError";
const ocrPhases: RecognitionPhase[] = ["loading", "review", "error", "unknown"];

export function CompleteActivityModal({ activity, actorId, actorName, recentMaterials, recentLoading, recentError, onRetryRecent, onClose, onSubmit }: {
  activity: CultivationActivity | null;
  actorId: string;
  actorName: string;
  recentMaterials: RecentMaterial[];
  recentLoading: boolean;
  recentError: string | null;
  onRetryRecent: () => void;
  onClose: () => void;
  onSubmit: (id: string, payload: CompleteCultivationActivityRequest) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CompletionDraft>({ startedAt: "", completedAt: "", actualArea: "", areaUnit: "ha", notes: "", inputUsages: [] });
  const [catalog, setCatalog] = useState<AgriculturalInput[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogErrorText, setCatalogErrorText] = useState("");
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [recognitionPhase, setRecognitionPhase] = useState<RecognitionPhase>("idle");
  const [recognitionDraft, setRecognitionDraft] = useState<RecognitionReviewDraft>(createRecognitionReviewDraft({}));
  const [recognitionError, setRecognitionError] = useState("");
  const [recognitionPhotoUri, setRecognitionPhotoUri] = useState("");
  const [recognitionSource, setRecognitionSource] = useState<MaterialRecordSource>("OCR");
  const recognitionRun = useRef(0);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scannedCode, setScannedCode] = useState<ScannedMaterialCode | null>(null);
  const [pendingScannedCode, setPendingScannedCode] = useState<ScannedMaterialCode | null>(null);
  const [scannedMaterial, setScannedMaterial] = useState<AgriculturalInput | null>(null);
  const [scanError, setScanError] = useState("");
  const [mappingWarning, setMappingWarning] = useState("");
  const scanRun = useRef(0);
  const scanLocked = useRef(false);
  useEffect(() => {
    if (!activity) return;
    recognitionRun.current += 1;
    scanRun.current += 1;
    scanLocked.current = false;
    const now = localNow();
    setDraft({ startedAt: now, completedAt: now, actualArea: "", areaUnit: "ha", notes: "", inputUsages: [] });
    setSearch("");
    setRecognitionPhase("idle");
    setRecognitionDraft(createRecognitionReviewDraft({}));
    setRecognitionError("");
    setRecognitionPhotoUri("");
    setRecognitionSource("OCR");
    setScannedCode(null); setPendingScannedCode(null); setScannedMaterial(null); setScanError(""); setMappingWarning("");
    setFormError("");
    return () => { recognitionRun.current += 1; scanRun.current += 1; scanLocked.current = true; };
  }, [activity]);
  useEffect(() => {
    if (!activity) return;
    let active = true;
    setCatalog([]); setCatalogError(false); setCatalogErrorText(""); setCatalogLoading(true);
    listAgriculturalInputs({ includeUserRecorded: true })
      .then((items) => { if (active) setCatalog(items.filter(canRecordUsage)); })
      .catch(error => { if (active) { setCatalogError(true); setCatalogErrorText(cultivationError(error, "Không thể tải danh mục vật tư.")); } })
      .finally(() => { if (active) setCatalogLoading(false); });
    return () => { active = false; };
  }, [activity?.id, catalogRetry]);
  const byId = useMemo(() => new Map(catalog.map((item) => [item.id, item])), [catalog]);
  const selectedIds = useMemo(() => new Set(draft.inputUsages.map((usage) => usage.agriculturalInputId)), [draft.inputUsages]);
  const matchingCatalog = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return catalog.filter((item) => !selectedIds.has(item.id) && (!term || [item.productName, item.tradeName, item.category, item.biologicalLevel,
      ...item.activeIngredients.map((ingredient) => ingredient.name)].some((value) => value?.toLocaleLowerCase().includes(term)))).slice(0, 8);
  }, [catalog, search, selectedIds]);
  if (!activity) return null;
  const selectMaterial = (input: AgriculturalInput, source: MaterialSelectionSource, preferredUnit?: string) => {
    const scanSession = scanRun.current;
    selectWithOptionalCodeMapping(input, source, pendingScannedCode,
      (selected, selectedSource) => setDraft((current) => ({ ...current, inputUsages: addSelectedMaterial(current.inputUsages, selected, preferredUnit, selectedSource) })),
      saveMaterialCodeMapping,
      () => { if (scanSession === scanRun.current) setMappingWarning("Đã chọn vật tư, nhưng chưa lưu được mã. Lần quét sau có thể cần tìm lại."); });
    setPendingScannedCode(null);
    setSearch("");
    if (source === "OCR" || source === "MANUAL" || source === "QR" || source === "BARCODE") setRecognitionPhase("idle");
  };
  const leaveRecognition = () => {
    recognitionRun.current += 1;
    scanRun.current += 1;
    scanLocked.current = true;
    if (pendingScannedCode && ocrPhases.includes(recognitionPhase)) setRecognitionPhase("scanUnknown");
    else { setRecognitionPhase("idle"); setPendingScannedCode(null); }
  };
  const openScanner = () => {
    recognitionRun.current += 1;
    scanRun.current += 1;
    scanLocked.current = false;
    setPendingScannedCode(null); setScannedCode(null); setScannedMaterial(null); setScanError("");
    setRecognitionPhase("scanner");
  };
  const onCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanLocked.current) return;
    scanLocked.current = true;
    const run = ++scanRun.current;
    const scanned = materialCodeFromScan(result.data, result.type);
    if (!scanned) { setScanError("Mã không hợp lệ. Vui lòng quét lại."); setRecognitionPhase("scanError"); return; }
    setScannedCode(scanned);
    setRecognitionPhase("scanLoading");
    try {
      const resolved = await resolveMaterialCode(scanned.code);
      if (run !== scanRun.current) return;
      if (resolved.found && resolved.agriculturalInput && canRecordUsage(resolved.agriculturalInput)) {
        setScannedMaterial(resolved.agriculturalInput);
        setCatalog((current) => current.some((item) => item.id === resolved.agriculturalInput!.id) ? current : [...current, resolved.agriculturalInput!]);
        setRecognitionPhase("scanFound");
      } else {
        setPendingScannedCode(scanned);
        setRecognitionPhase("scanUnknown");
      }
    } catch (error) {
      if (run !== scanRun.current) return;
      setPendingScannedCode(scanned);
      setScanError(cultivationError(error, "Không thể tra cứu mã. Vui lòng thử lại."));
      setRecognitionPhase("scanError");
    }
  };
  const pickLabel = async (source: "camera" | "library") => {
    const run = ++recognitionRun.current;
    try {
      const permission = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error("Cần quyền truy cập camera hoặc thư viện ảnh để đọc nhãn.");
      const picked = source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
      if (run !== recognitionRun.current || picked.canceled || !picked.assets[0]) return;
      setRecognitionPhotoUri(picked.assets[0].uri);
      setRecognitionSource("OCR");
      setRecognitionPhase("loading");
      setRecognitionError("");
      const result = await recognizeMaterialLabel(picked.assets[0]);
      if (run !== recognitionRun.current) return;
      setRecognitionDraft(createRecognitionReviewDraft(result));
      setRecognitionPhase("review");
    } catch (error) {
      if (run !== recognitionRun.current) return;
      setRecognitionError(materialRecognitionError(error));
      setRecognitionPhase("error");
    }
  };
  const confirmRecognition = async () => {
    if (!recognitionDraft.productName.trim()) {
      setRecognitionError("Vui lòng nhập tên vật tư trước khi xác nhận.");
      return;
    }
    const matched = resolveExistingMaterial(recognitionDraft.productName, catalog);
    if (matched) {
      selectMaterial(matched, "OCR");
      return;
    }
    try {
      setSubmitting(true);
      const created = await createUserRecordedAgriculturalInput(userRecordedMaterialRequest(recognitionDraft, recognitionSource));
      setCatalog((current) => current.some((item) => item.id === created.id) ? current : [...current, created]);
      selectMaterial(created, recognitionSource === "OCR" ? "OCR" : "MANUAL");
    } catch (error) {
      setRecognitionError(cultivationError(error, "Không thể lưu vật tư vừa nhập. Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  };
  const updateIngredient = (index: number, changes: Partial<RecognitionReviewDraft["activeIngredients"][number]>) =>
    setRecognitionDraft((current) => ({ ...current, activeIngredients: current.activeIngredients.map((item, position) => position === index ? { ...item, ...changes } : item) }));
  const searchManually = () => {
    recognitionRun.current += 1;
    setSearch(recognitionDraft.productName);
    setRecognitionPhase("idle");
  };
  const enterMaterialManually = (source: MaterialRecordSource = "MANUAL") => {
    recognitionRun.current += 1;
    setRecognitionSource(source);
    setRecognitionPhotoUri("");
    setRecognitionError("");
    setRecognitionDraft(createRecognitionReviewDraft({}));
    setRecognitionPhase("review");
  };
  const updateUsage = (index: number, changes: Partial<CompletionDraft["inputUsages"][number]>) =>
    setDraft((current) => ({ ...current, inputUsages: current.inputUsages.map((usage, position) => position === index ? { ...usage, ...changes } : usage) }));
  const submit = async () => {
    setFormError("");
    try {
      const payload = buildCompletionPayload(activity.activityType, draft, catalog, actorId);
      setSubmitting(true);
      await onSubmit(activity.id, payload);
      onClose();
    } catch (error) {
      setFormError(cultivationError(error, "Không thể hoàn thành công việc."));
    } finally { setSubmitting(false); }
  };
  const field = (label: string, value: string, onChange: (value: string) => void, numeric = false) =>
    <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput keyboardType={numeric ? "decimal-pad" : "default"} onChangeText={onChange} style={styles.input} value={value} /></View>;
  return <Modal animationType="slide" onRequestClose={recognitionPhase === "idle" ? onClose : leaveRecognition} visible><SafeAreaView style={styles.safe}><View style={styles.header}><Text style={styles.title}>{recognitionPhase === "idle" ? "Hoàn thành công việc" : ocrPhases.includes(recognitionPhase) ? "Nhận diện nhãn vật tư" : "Quét mã vật tư"}</Text><Pressable disabled={submitting} onPress={recognitionPhase === "idle" ? onClose : leaveRecognition}><Text style={styles.link}>{recognitionPhase === "idle" ? "Đóng" : "Trở lại"}</Text></Pressable></View><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    {recognitionPhase !== "idle" ? <>
      {recognitionPhase === "scanner" ? <View style={styles.field}>
        {!cameraPermission ? <ActivityIndicator color={durianTheme.colors.moss} /> : cameraPermission.granted ? <>
          <Text style={styles.context}>Đưa mã QR hoặc mã vạch trên bao bì vào giữa khung hình.</Text>
          <CodeScannerCamera style={styles.codeCamera} materialCodes onScan={(result) => void onCodeScanned(result)} onError={() => { setScanError("Không thể mở camera. Vui lòng thử lại."); setRecognitionPhase("scanError"); }} />
        </> : <>
          <Text style={styles.error}>Cần quyền truy cập camera để quét mã vật tư.</Text>
          {cameraPermission.canAskAgain ? <Pressable onPress={() => void requestCameraPermission()} style={styles.choice}><Text style={styles.link}>Cấp quyền camera</Text></Pressable> : <Pressable onPress={() => void Linking.openSettings()} style={styles.choice}><Text style={styles.link}>Mở cài đặt ứng dụng</Text></Pressable>}
        </>}
        <Pressable onPress={leaveRecognition} style={styles.choice}><Text style={styles.link}>Hủy</Text></Pressable>
      </View> : null}
      {recognitionPhase === "scanLoading" ? <View style={styles.field}><ActivityIndicator color={durianTheme.colors.moss} /><Text style={styles.context}>Đang tra cứu mã {scannedCode?.code}...</Text></View> : null}
      {recognitionPhase === "scanFound" && scannedMaterial ? <View style={styles.field}>
        <Text style={styles.section}>✓ Đã nhận diện</Text>
        <Text style={styles.context}>Mã: {scannedCode?.code}</Text>
        <Text style={styles.choiceName}>{scannedMaterial.tradeName || scannedMaterial.productName}</Text>
        <Text style={styles.context}>{scannedMaterial.category} · {scannedMaterial.unit || "Chưa có đơn vị"}</Text>
        <Pressable onPress={() => selectMaterial(scannedMaterial, scannedCode?.codeType || "QR")} style={styles.submit}><Text style={styles.submitText}>Chọn vật tư</Text></Pressable>
        <Pressable onPress={openScanner} style={styles.choice}><Text style={styles.link}>Quét lại</Text></Pressable>
      </View> : null}
      {recognitionPhase === "scanUnknown" ? <View style={styles.field}>
        <Text style={styles.section}>Không tìm thấy vật tư cho mã này.</Text>
        <Text style={styles.context}>Mã: {scannedCode?.code}</Text>
        <Text style={styles.context}>Bạn có thể nhận diện hoặc nhập vật tư mới để dùng ngay. Mã sẽ được liên kết với bản ghi này cho lần quét sau.</Text>
        <Pressable onPress={() => void pickLabel("camera")} style={styles.choice}><Text style={styles.link}>Chụp nhãn</Text></Pressable>
        <Pressable onPress={() => enterMaterialManually(scannedCode?.codeType || "MANUAL")} style={styles.choice}><Text style={styles.link}>Nhập vật tư mới</Text></Pressable>
        <Pressable onPress={() => { setSearch(""); setRecognitionPhase("idle"); }} style={styles.choice}><Text style={styles.link}>Tìm vật tư</Text></Pressable>
        <Pressable onPress={openScanner} style={styles.choice}><Text style={styles.link}>Quét lại</Text></Pressable>
      </View> : null}
      {recognitionPhase === "scanError" ? <View style={styles.field}>
        <Text style={styles.error}>{scanError}</Text>
        {scannedCode ? <Text style={styles.context}>Mã: {scannedCode.code}</Text> : null}
        <Pressable onPress={openScanner} style={styles.choice}><Text style={styles.link}>Quét lại</Text></Pressable>
        {pendingScannedCode ? <Pressable onPress={() => { setSearch(""); setRecognitionPhase("idle"); }} style={styles.choice}><Text style={styles.link}>Tìm vật tư</Text></Pressable> : null}
      </View> : null}
      {recognitionPhase === "loading" ? <View style={styles.field}><ActivityIndicator color={durianTheme.colors.moss} /><Text style={styles.context}>Đang đọc thông tin trên nhãn...</Text></View> : null}
      {recognitionPhase === "error" ? <View style={styles.field}><Text style={styles.error}>{recognitionError}</Text><Pressable onPress={() => void pickLabel("camera")} style={styles.choice}><Text style={styles.link}>Chụp lại</Text></Pressable><Pressable onPress={searchManually} style={styles.choice}><Text style={styles.link}>Tìm vật tư</Text></Pressable><Pressable onPress={leaveRecognition} style={styles.choice}><Text style={styles.link}>Hủy</Text></Pressable></View> : null}
      {recognitionPhase === "review" ? <>
        <Text style={styles.section}>Nhận diện nhãn vật tư</Text>
        <Text style={styles.context}>Thông tin này được nhận diện hoặc nhập thủ công. Vui lòng kiểm tra và có thể sửa trước khi sử dụng.</Text>
        {recognitionPhotoUri ? <Image source={{ uri: recognitionPhotoUri }} style={styles.labelPhoto} resizeMode="contain" /> : null}
        {field("Tên vật tư", recognitionDraft.productName, (productName) => setRecognitionDraft((current) => ({ ...current, productName })))}
        {field("Phân loại", recognitionDraft.category, (category) => setRecognitionDraft((current) => ({ ...current, category })))}
        <Text style={styles.label}>Hoạt chất (nếu đọc được)</Text>
        {recognitionDraft.activeIngredients.map((ingredient, index) => <View key={index} style={styles.usage}>
          {field("Tên hoạt chất", ingredient.name, (name) => updateIngredient(index, { name }))}
          {field("Nồng độ", ingredient.concentration, (concentration) => updateIngredient(index, { concentration }), true)}
          {field("Đơn vị nồng độ", ingredient.concentrationUnit, (concentrationUnit) => updateIngredient(index, { concentrationUnit }))}
          <Pressable onPress={() => setRecognitionDraft((current) => ({ ...current, activeIngredients: current.activeIngredients.filter((_, position) => position !== index) }))}><Text style={styles.remove}>Xóa hoạt chất</Text></Pressable>
        </View>)}
        <Pressable onPress={() => setRecognitionDraft((current) => ({ ...current, activeIngredients: [...current.activeIngredients, { name: "", concentration: "", concentrationUnit: "" }] }))} style={styles.choice}><Text style={styles.link}>+ Thêm hoạt chất</Text></Pressable>
        {field("Nhà sản xuất (nếu có)", recognitionDraft.manufacturer, (manufacturer) => setRecognitionDraft((current) => ({ ...current, manufacturer })))}
        {field("Số đăng ký (nếu có)", recognitionDraft.registrationNumber, (registrationNumber) => setRecognitionDraft((current) => ({ ...current, registrationNumber })))}
        {recognitionError ? <Text style={styles.error}>{recognitionError}</Text> : null}
        <Pressable disabled={submitting || catalogLoading} onPress={() => void confirmRecognition()} style={[styles.submit, (submitting || catalogLoading) && styles.disabled]}><Text style={styles.submitText}>{submitting ? "Đang lưu vật tư..." : "Dùng vật tư này"}</Text></Pressable>
        <Pressable onPress={() => void pickLabel("camera")} style={styles.choice}><Text style={styles.link}>Chụp lại</Text></Pressable>
        <Pressable onPress={searchManually} style={styles.choice}><Text style={styles.link}>Tìm vật tư thủ công</Text></Pressable>
      </> : null}
    </> : <>
    <Text style={styles.subtitle}>{activity.title} · {activityTypeLabels[activity.activityType]}</Text>
    <Text style={styles.section}>Thông tin thực hiện</Text>
    {field("Bắt đầu (YYYY-MM-DDTHH:mm)", draft.startedAt, (startedAt) => setDraft({ ...draft, startedAt }))}
    {field("Hoàn thành (YYYY-MM-DDTHH:mm)", draft.completedAt, (completedAt) => setDraft({ ...draft, completedAt }))}
    <Text style={styles.label}>Người thực hiện: {actorName || actorId}</Text>
    {field("Diện tích thực hiện", draft.actualArea, (actualArea) => setDraft({ ...draft, actualArea }), true)}
    {field("Đơn vị diện tích", draft.areaUnit, (areaUnit) => setDraft({ ...draft, areaUnit }))}
    {field("Ghi chú", draft.notes, (notes) => setDraft({ ...draft, notes }))}
    <Text style={styles.section}>Vật tư thực tế đã sử dụng {requiresRecordedInput(activity.activityType) ? "*" : ""}</Text>
    <Pressable disabled={submitting} onPress={openScanner} style={styles.choice}><Text style={styles.link}>Quét mã QR / mã vạch</Text></Pressable>
    <Pressable disabled={submitting} onPress={() => void pickLabel("camera")} style={styles.choice}><Text style={styles.link}>Chụp nhãn vật tư</Text></Pressable>
    <Pressable disabled={submitting} onPress={() => void pickLabel("library")} style={styles.choice}><Text style={styles.link}>Chọn ảnh nhãn từ thư viện</Text></Pressable>
    <Pressable disabled={submitting} onPress={() => enterMaterialManually()} style={styles.choice}><Text style={styles.link}>Nhập vật tư mới</Text></Pressable>
    {pendingScannedCode ? <View style={styles.field}><Text style={styles.context}>Đang liên kết mã {pendingScannedCode.code}: bạn có thể chọn hoặc nhập vật tư để dùng ngay.</Text><Pressable onPress={() => setPendingScannedCode(null)}><Text style={styles.link}>Hủy liên kết mã</Text></Pressable></View> : null}
    {mappingWarning ? <Text style={styles.error}>{mappingWarning}</Text> : null}
    {recentLoading ? <Text style={styles.context}>Đang tải vật tư đã dùng gần đây...</Text> : null}
    {recentError ? <View><Text style={styles.error}>{recentError}</Text><Pressable onPress={onRetryRecent}><Text style={styles.link}>Tải lại lịch sử vật tư</Text></Pressable></View> : null}
    {catalogLoading ? <ActivityIndicator color={durianTheme.colors.moss} /> : catalogError ? <View><Text style={styles.error}>{catalogErrorText}</Text><Pressable onPress={() => setCatalogRetry(value => value + 1)}><Text style={styles.link}>Thử tải lại danh mục</Text></Pressable></View> : catalog.length === 0 ? <Text>Chưa có vật tư trong danh mục của bạn.</Text> : null}
    {recentMaterials.some((item) => byId.has(item.agriculturalInputId) && !selectedIds.has(item.agriculturalInputId)) ? <View style={styles.field}>
      <Text style={styles.label}>Đã dùng gần đây</Text>
      {recentMaterials.filter((item) => byId.has(item.agriculturalInputId) && !selectedIds.has(item.agriculturalInputId)).map((item) => <Pressable key={item.agriculturalInputId} onPress={() => selectMaterial(byId.get(item.agriculturalInputId)!, "RECENT", item.quantityUnit)} style={styles.choice}>
        <View style={styles.choiceCopy}><Text style={styles.choiceName}>{item.name}</Text><Text style={styles.context}>{item.lastQuantity} {item.quantityUnit} lần trước{item.category ? ` · ${item.category}` : ""}</Text></View><Text style={styles.link}>+ Thêm</Text>
      </Pressable>)}
    </View> : null}
    <View style={styles.field}><Text style={styles.label}>Tìm vật tư</Text><TextInput onChangeText={setSearch} placeholder="Tìm tên vật tư, hoạt chất..." style={styles.input} value={search} /></View>
    {!catalogLoading && !catalogError && matchingCatalog.map((item) => <Pressable key={item.id} onPress={() => selectMaterial(item, "SEARCH")} style={styles.choice}>
      <View style={styles.choiceCopy}><Text style={styles.choiceName}>{item.tradeName || item.productName}</Text><Text style={styles.context}>{item.category} · {item.unit || "Chưa có đơn vị"}</Text></View><Text style={styles.link}>+ Thêm</Text>
    </Pressable>)}
    {!catalogLoading && !catalogError && search.trim() && matchingCatalog.length === 0 ? <Text style={styles.context}>Không tìm thấy vật tư phù hợp.</Text> : null}
    {draft.inputUsages.map((usage, index) => { const input = byId.get(usage.agriculturalInputId); return <View key={index} style={styles.usage}>
      <Text style={styles.choiceName}>{input?.tradeName || input?.productName || usage.agriculturalInputId}</Text>
      {input ? <Text style={styles.context}>Loại: {input.category} · Nhà sản xuất: {input.manufacturer || "—"} · Số đăng ký: {input.registrationNumber || "—"}{"\n"}Hoạt chất: {input.activeIngredients?.map((ingredient) => ingredient.name).join(", ") || "—"} · PHI: {input.preHarvestIntervalDays ?? "—"} ngày · Liều khuyến nghị: {input.recommendedDose || "—"}</Text> : null}
      {field("Số lượng", usage.quantityUsed, (quantityUsed) => updateUsage(index, { quantityUsed }), true)}
      {field("Đơn vị", usage.quantityUnit, (quantityUnit) => updateUsage(index, { quantityUnit }))}
      {field("Batch/Lot", usage.batchNumber, (batchNumber) => updateUsage(index, { batchNumber }))}
      <Pressable onPress={() => setDraft((current) => ({ ...current, inputUsages: current.inputUsages.filter((_, position) => position !== index) }))}><Text style={styles.remove}>Xóa vật tư</Text></Pressable>
    </View>; })}
    {formError ? <Text style={styles.error}>{formError}</Text> : null}
    <Pressable disabled={submitting} onPress={() => void submit()} style={[styles.submit, submitting && styles.disabled]}><Text style={styles.submitText}>{submitting ? "Đang lưu..." : "Ghi hoàn thành"}</Text></Pressable>
    </>}
  </ScrollView></SafeAreaView></Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: durianTheme.colors.surface }, header: { flexDirection: "row", justifyContent: "space-between", padding: 18 }, title: { color: durianTheme.colors.ink, fontSize: 18, fontWeight: "900" }, link: { color: durianTheme.colors.moss, fontWeight: "900" }, content: { gap: 14, padding: 18, paddingBottom: 40 }, subtitle: { color: durianTheme.colors.muted }, section: { color: durianTheme.colors.ink, fontSize: 15, fontWeight: "900" }, field: { gap: 5 }, label: { color: durianTheme.colors.ink, fontSize: 12, fontWeight: "800" }, input: { borderColor: durianTheme.colors.mossSoft, borderRadius: 10, borderWidth: 1, color: durianTheme.colors.ink, padding: 12 }, codeCamera: { height: 380, borderRadius: 12, overflow: "hidden" }, labelPhoto: { height: 180, width: "100%", borderRadius: 10 }, usage: { borderColor: durianTheme.colors.mossSoft, borderRadius: 12, borderWidth: 1, gap: 10, padding: 12 }, choice: { borderColor: durianTheme.colors.mossSoft, borderRadius: 10, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8, padding: 10 }, choiceCopy: { flex: 1 }, choiceName: { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "800" }, context: { color: durianTheme.colors.muted, fontSize: 12, lineHeight: 19 }, remove: { color: durianTheme.colors.danger, fontWeight: "800" }, error: { color: durianTheme.colors.danger }, submit: { backgroundColor: durianTheme.colors.moss, borderRadius: 12, padding: 14, alignItems: "center" }, submitText: { color: durianTheme.colors.white, fontWeight: "900" }, disabled: { opacity: 0.5 },
});
