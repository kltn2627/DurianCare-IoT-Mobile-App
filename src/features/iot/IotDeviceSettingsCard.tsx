import { useCallback, useEffect, useRef, useState } from "react";
import { soilMoistureText } from "./soil";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Plus, Save, Trash2 } from "lucide-react-native";

import { durianTheme } from "@/src/theme/durianTheme";
import {
  DELIVERY_LABELS, METRIC_LABELS, SEVERITY_LABELS, iotLifecycleApi, lifecycleMessage, validateRule,
  type IotAlertRule, type IotDefaultRule, type IotDeviceConfig, type IotDeviceDetail, type IotMetric, type IotSeverity,
} from "./lifecycleApi";

const METRICS: IotMetric[] = ["TEMPERATURE", "HUMIDITY", "SOIL_MOISTURE", "LIGHT"];
const UNITS: Record<IotMetric, string> = { TEMPERATURE: "°C", HUMIDITY: "%", SOIL_MOISTURE: "%", LIGHT: "" };

function when(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

/** Device facts, configuration (UC81) and thresholds (UC85) for the selected device. */
export function IotDeviceSettingsCard({ deviceId }: { deviceId: string }) {
  const [device, setDevice] = useState<IotDeviceDetail | null>(null);
  const [config, setConfig] = useState<IotDeviceConfig | null>(null);
  const [rules, setRules] = useState<IotAlertRule[]>([]);
  const [defaults, setDefaults] = useState<IotDefaultRule[]>([]);
  const [interval, setIntervalText] = useState("10");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [metric, setMetric] = useState<IotMetric>("SOIL_MOISTURE");
  const [minText, setMinText] = useState("");
  const [maxText, setMaxText] = useState("");
  const [bandText, setBandText] = useState("0");
  const [severity, setSeverity] = useState<IotSeverity>("WARNING");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [detail, cfg] = await Promise.all([iotLifecycleApi.getDevice(deviceId), iotLifecycleApi.getConfig(deviceId)]);
      setDevice(detail.device);
      setConfig(cfg.config);
      setIntervalText(String(cfg.config.publishIntervalSeconds ?? 10));
      setAlertsEnabled(cfg.config.alertsEnabled);
      const list = await iotLifecycleApi.listRules(detail.device.farmId, detail.device.cultivationAreaId);
      setRules(list.rules.filter((r) => !r.deviceId || r.deviceId === detail.device.id));
      setDefaults(list.defaults);
    } catch (cause) {
      setError(lifecycleMessage(cause, "Không thể tải cài đặt thiết bị."));
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => { void load(); }, [load]);

  async function run(key: string, work: () => Promise<unknown>, reload = true) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(key);
    setError(null);
    try {
      await work();
      if (reload) await load();
    } catch (cause) {
      setError(lifecycleMessage(cause, "Không thể lưu thay đổi."));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  function saveConfig() {
    const seconds = Number(interval);
    if (!Number.isInteger(seconds) || seconds < 5 || seconds > 3600) {
      setError("Chu kỳ gửi phải là số nguyên từ 5 đến 3600 giây.");
      return;
    }
    void run("config", async () => {
      setConfig((await iotLifecycleApi.saveConfig(deviceId, { publishIntervalSeconds: seconds, alertsEnabled })).config);
    }, false);
  }

  function addRule() {
    if (!device) return;
    const parse = (text: string) => (text.trim() === "" ? null : Number(text.replace(",", ".")));
    const min = parse(minText);
    const max = parse(maxText);
    const band = Number(bandText.replace(",", ".") || 0);
    const invalid = validateRule(metric, min, max, band);
    if (invalid) {
      setError(invalid);
      return;
    }
    void run("add", async () => {
      await iotLifecycleApi.createRule({ farmId: device.farmId, cultivationAreaId: device.cultivationAreaId, metric,
        minValue: min, maxValue: max, hysteresis: band, severity, notify: true });
      setMinText(""); setMaxText(""); setBandText("0");
    });
  }

  if (loading) return <View style={styles.card}><ActivityIndicator color={durianTheme.colors.moss} /></View>;
  if (!device) {
    return <View style={styles.card}>
      <Text style={styles.error}>{error ?? "Không tìm thấy thiết bị."}</Text>
      <Pressable onPress={() => { setLoading(true); void load(); }} style={styles.secondaryButton}><Text style={styles.secondaryText}>Thử lại</Text></Pressable>
    </View>;
  }

  const range = (min: number | null, max: number | null, unit: string) =>
    [min !== null ? `≥ ${min}${unit}` : null, max !== null ? `≤ ${max}${unit}` : null].filter(Boolean).join(" và ") || "—";
  const latest = device.latestByMetric;

  return <View style={styles.card}>
    <Text style={styles.title}>Cài đặt thiết bị</Text>
    <View style={styles.factRow}>
      <Fact label="Loại" value={device.deviceType === "CAMERA" ? "Camera" : "Cảm biến"} />
      <Fact label="Firmware" value={device.firmwareVersion ?? "Chưa báo"} />
      <Fact label="Kích hoạt" value={when(device.claimedAt)} />
    </View>
    {latest ? <View style={styles.factRow}>
      <Fact label="Nhiệt độ" value={latest.temperature ? `${latest.temperature.value}°C` : "—"} />
      <Fact label="Độ ẩm KK" value={latest.humidity ? `${latest.humidity.value}%` : "—"} />
      <Fact label="Độ ẩm đất" value={soilMoistureText(latest.soilMoisture, latest.soilSensor)} />
    </View> : null}

    <Text style={styles.subtitle}>Cấu hình</Text>
    <View style={styles.inline}>
      <Text style={styles.label}>Chu kỳ gửi (giây)</Text>
      <TextInput keyboardType="number-pad" value={interval} onChangeText={setIntervalText} style={styles.smallInput}
        editable={busy === null && config?.deviceSupportsRemoteConfig !== false} />
    </View>
    <View style={styles.inline}>
      <Text style={styles.label}>Bật cảnh báo</Text>
      <Switch value={alertsEnabled} onValueChange={setAlertsEnabled} disabled={busy !== null} trackColor={{ true: durianTheme.colors.moss }} />
    </View>
    {config ? <Text style={styles.meta}>Trạng thái: {DELIVERY_LABELS[config.deliveryStatus]}{config.configVersion ? ` · phiên bản ${config.configVersion}` : ""}{config.appliedAt ? ` · áp dụng ${when(config.appliedAt)}` : ""}</Text> : null}
    <Pressable disabled={busy !== null} onPress={saveConfig} style={[styles.primaryButton, busy !== null && styles.disabled]}>
      {busy === "config" ? <ActivityIndicator color={durianTheme.colors.white} /> : <Save color={durianTheme.colors.white} size={16} />}
      <Text style={styles.primaryText}>Lưu cấu hình</Text>
    </Pressable>

    <Text style={styles.subtitle}>Ngưỡng cảnh báo</Text>
    {METRICS.map((m) => {
      const own = rules.filter((r) => r.metric === m);
      const fallback = defaults.find((d) => d.metric === m);
      if (own.length === 0) {
        return <Text key={m} style={styles.ruleText}>{METRIC_LABELS[m]}: {fallback ? `mặc định ${range(fallback.minValue, fallback.maxValue, UNITS[m])}` : "chưa đặt"}</Text>;
      }
      return own.map((rule) => <View key={rule.id} style={styles.ruleRow}>
        <Text style={[styles.ruleText, styles.flex]}>{METRIC_LABELS[m]}: {range(rule.minValue, rule.maxValue, UNITS[m])} · {SEVERITY_LABELS[rule.severity]}</Text>
        <Switch value={rule.enabled} disabled={busy !== null} onValueChange={(enabled) => void run(rule.id, () => iotLifecycleApi.updateRule(rule.id, { enabled }))}
          trackColor={{ true: durianTheme.colors.moss }} />
        <Pressable accessibilityLabel="Xóa ngưỡng" disabled={busy !== null} onPress={() => void run(rule.id, () => iotLifecycleApi.deleteRule(rule.id))} style={styles.iconButton}>
          <Trash2 color={durianTheme.colors.danger} size={16} />
        </Pressable>
      </View>);
    })}
    <View style={styles.chips}>
      {METRICS.map((m) => <Pressable key={m} onPress={() => setMetric(m)} style={[styles.chip, metric === m && styles.chipActive]}>
        <Text style={[styles.chipText, metric === m && styles.chipTextActive]}>{METRIC_LABELS[m]}</Text></Pressable>)}
    </View>
    <View style={styles.inline}>
      <TextInput placeholder="Thấp" keyboardType="decimal-pad" value={minText} onChangeText={setMinText} style={[styles.smallInput, styles.flex]} />
      <TextInput placeholder="Cao" keyboardType="decimal-pad" value={maxText} onChangeText={setMaxText} style={[styles.smallInput, styles.flex]} />
      <TextInput placeholder="Đệm" keyboardType="decimal-pad" value={bandText} onChangeText={setBandText} style={[styles.smallInput, styles.flex]} />
    </View>
    <View style={styles.chips}>
      {(["INFO", "WARNING", "CRITICAL"] as IotSeverity[]).map((s) => <Pressable key={s} onPress={() => setSeverity(s)} style={[styles.chip, severity === s && styles.chipActive]}>
        <Text style={[styles.chipText, severity === s && styles.chipTextActive]}>{SEVERITY_LABELS[s]}</Text></Pressable>)}
    </View>
    <Pressable disabled={busy !== null} onPress={addRule} style={[styles.primaryButton, busy !== null && styles.disabled]}>
      {busy === "add" ? <ActivityIndicator color={durianTheme.colors.white} /> : <Plus color={durianTheme.colors.white} size={16} />}
      <Text style={styles.primaryText}>Thêm ngưỡng</Text>
    </Pressable>
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <View style={styles.fact}><Text style={styles.factLabel}>{label}</Text><Text style={styles.factValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: durianTheme.colors.white, borderColor: "#ECE8D8", borderRadius: 18, borderWidth: 1, gap: 10, padding: 16 },
  title: { color: durianTheme.colors.ink, fontSize: 16, fontWeight: "900" },
  subtitle: { color: durianTheme.colors.ink, fontSize: 13, fontWeight: "800", marginTop: 6 },
  factRow: { flexDirection: "row", gap: 8 },
  fact: { backgroundColor: "#F6F8F5", borderRadius: 12, flex: 1, padding: 8 },
  factLabel: { color: durianTheme.colors.muted, fontSize: 10, fontWeight: "700" },
  factValue: { color: durianTheme.colors.ink, fontSize: 13, fontWeight: "800" },
  inline: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  label: { color: durianTheme.colors.ink, fontSize: 13, fontWeight: "600" },
  smallInput: { borderColor: "#D7D3C4", borderRadius: 10, borderWidth: 1, color: durianTheme.colors.ink, minWidth: 72, paddingHorizontal: 10, paddingVertical: 8 },
  meta: { color: durianTheme.colors.muted, fontSize: 12 },
  primaryButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: durianTheme.colors.moss, borderRadius: 12, flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  primaryText: { color: durianTheme.colors.white, fontSize: 13, fontWeight: "800" },
  secondaryButton: { alignSelf: "flex-start", borderColor: durianTheme.colors.moss, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  secondaryText: { color: durianTheme.colors.moss, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  ruleRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  ruleText: { color: durianTheme.colors.ink, fontSize: 12 },
  flex: { flex: 1 },
  iconButton: { padding: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderColor: "#D7D3C4", borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  chipText: { color: durianTheme.colors.ink, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: durianTheme.colors.white },
  error: { color: durianTheme.colors.danger, fontSize: 12, fontWeight: "700" },
});
