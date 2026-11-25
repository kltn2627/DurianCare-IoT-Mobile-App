import {
  Activity,
  AlertCircle,
  Bell,
  Droplets,
  Gauge,
  RadioTower,
  RefreshCw,
  Save,
  Settings,
  ThermometerSun,
  Trash2,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import {
  listAuthorizedFarms,
  listCultivationActivities,
  listCultivationPlans,
  listOwnedFarms,
} from "@/src/features/cultivation/api/cultivationApi";
import {
  buildFoundationFarmOptions,
  buildFoundationZoneOptions,
  shortFoundationId,
} from "@/src/features/cultivation/api/farmFoundation";
import type {
  AuthorizedFarm,
  CareFarmOption,
  CareZoneOption,
  CultivationActivity,
  CultivationPlan,
  FarmCatalog,
} from "@/src/features/cultivation/api/cultivationTypes";
import { durianTheme } from "@/src/theme/durianTheme";

import { iotApi } from "./iotApi";
import { iotLifecycleApi, lifecycleMessage } from "./lifecycleApi";
import { IotDeviceSettingsCard } from "./IotDeviceSettingsCard";
import { SensorAnalytics } from "./SensorAnalytics";
import { soilMoistureOf } from "./sensorSeries";
import type { IotAlert, IotDevice, IotTelemetryReading, MutableIotDeviceStatus } from "./types";

const DEVICE_STATUSES: MutableIotDeviceStatus[] = ["ACTIVE", "INACTIVE", "MAINTENANCE"];

type MetricKey = "humidity" | "soil" | "temperature";
type FoundationData = {
  activities: CultivationActivity[];
  authorizedFarms: AuthorizedFarm[];
  ownedFarms: FarmCatalog[];
  plans: CultivationPlan[];
};

const METRICS: Array<{
  accent: string;
  icon: typeof Activity;
  key: MetricKey;
  label: string;
  unit: string;
}> = [
  {
    accent: "#FFB866",
    icon: ThermometerSun,
    key: "temperature",
    label: "Nhiệt độ",
    unit: "°C",
  },
  {
    accent: "#8DD6C3",
    icon: Droplets,
    key: "humidity",
    label: "Độ ẩm không khí",
    unit: "%",
  },
  {
    accent: "#BFD9A8",
    icon: Gauge,
    key: "soil",
    label: "Độ ẩm đất",
    unit: "%",
  },
];

export function DurianClimateMonitorScreen() {
  const [devices, setDevices] = useState<IotDevice[]>([]);
  const [alerts, setAlerts] = useState<IotAlert[]>([]);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [latest, setLatest] = useState<IotTelemetryReading | null>(null);
  const [analyticsKey, setAnalyticsKey] = useState(0);
  const [foundation, setFoundation] = useState<FoundationData>({ activities: [], authorizedFarms: [], ownedFarms: [], plans: [] });
  const [registerDraft, setRegisterDraft] = useState({
    claimCode: "",
    cultivationAreaId: "",
    deviceUid: "",
    farmId: "",
    name: "",
  });
  const [editDraft, setEditDraft] = useState<{
    cultivationAreaId: string;
    farmId: string;
    name: string;
    status: MutableIotDeviceStatus;
  }>({
    cultivationAreaId: "",
    farmId: "",
    name: "",
    status: "ACTIVE",
  });
  const [error, setError] = useState<string | null>(null);
  // Only a user pull shows the spinner: on iOS a programmatic `refreshing` jumps the list back to the top.
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) ?? devices[0] ?? null,
    [devices, selectedDeviceId],
  );
  const farms = useMemo(() => buildFoundationFarmOptions(foundation), [foundation]);
  const selectedRegisterFarmId = registerDraft.farmId || farms[0]?.farmId || "";
  const registerZones = useMemo(
    () => buildFoundationZoneOptions(foundation, selectedRegisterFarmId),
    [foundation, selectedRegisterFarmId],
  );
  const editZones = useMemo(
    () => buildFoundationZoneOptions(foundation, editDraft.farmId),
    [editDraft.farmId, foundation],
  );

  const loadFoundation = useCallback(async () => {
    const [owned, authorized, plans, activities] = await Promise.allSettled([
      listOwnedFarms(),
      listAuthorizedFarms(),
      listCultivationPlans(),
      listCultivationActivities(),
    ]);
    const next = {
      activities: activities.status === "fulfilled" ? activities.value : [],
      authorizedFarms: authorized.status === "fulfilled" ? authorized.value : [],
      ownedFarms: owned.status === "fulfilled" ? owned.value : [],
      plans: plans.status === "fulfilled" ? plans.value : [],
    };
    setFoundation(next);
    const nextFarms = buildFoundationFarmOptions(next);
    if (!registerDraft.farmId && nextFarms[0]?.farmId) {
      setRegisterDraft((current) => ({ ...current, farmId: nextFarms[0].farmId }));
    }
  }, [registerDraft.farmId]);

  const loadDevices = useCallback(async () => {
    setError(null);
    try {
      const response = await iotApi.listDevices();
      const nextDevices = Array.isArray(response?.devices) ? response.devices : [];
      setDevices(nextDevices);
      const nextDeviceId = nextDevices.some((device) => device.id === selectedDeviceId)
        ? selectedDeviceId
        : nextDevices[0]?.id ?? "";
      setSelectedDeviceId(nextDeviceId);
      if (!nextDeviceId) setLatest(null);
    } catch (loadError) {
      setError(messageFromError(loadError));
    }
  }, [selectedDeviceId]);

  const loadAlerts = useCallback(async () => {
    try {
      const response = await iotApi.listAlerts("ALERTING");
      if (!Array.isArray(response?.alerts)) {
        throw new Error("Dữ liệu cảnh báo không hợp lệ. Vui lòng tải lại.");
      }
      setAlerts(response.alerts);
      setAlertsError(null);
    } catch (loadError) {
      setAlerts([]);
      setAlertsError(messageFromError(loadError));
    }
  }, []);

  const loadTelemetry = useCallback(async (deviceId: string) => {
    if (!deviceId) return;
    setError(null);
    try {
      const latestResponse = await iotApi.latestTelemetry(deviceId);
      setLatest(latestResponse?.telemetry ?? null);
    } catch (loadError) {
      setError(messageFromError(loadError));
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadDevices(), loadFoundation(), loadAlerts()]);
      if (selectedDeviceId) await loadTelemetry(selectedDeviceId);
      setAnalyticsKey((key) => key + 1);
    } finally {
      setRefreshing(false);
    }
  }, [loadAlerts, loadDevices, loadFoundation, loadTelemetry, selectedDeviceId]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    void loadFoundation();
  }, [loadFoundation]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    if (selectedDeviceId) {
      void loadTelemetry(selectedDeviceId);
    }
  }, [loadTelemetry, selectedDeviceId]);

  useEffect(() => {
    if (!selectedDevice) return;
    setEditDraft({
      cultivationAreaId: selectedDevice.cultivationAreaId ?? "",
      farmId: selectedDevice.farmId,
      name: selectedDevice.name,
      status: DEVICE_STATUSES.includes(selectedDevice.status as MutableIotDeviceStatus)
        ? (selectedDevice.status as MutableIotDeviceStatus)
        : "ACTIVE",
    });
  }, [selectedDevice]);

  async function submitRegisterDevice() {
    const farmId = selectedRegisterFarmId;
    if (submitting) return;
    if (!/^[A-Za-z0-9._:-]{3,150}$/.test(registerDraft.deviceUid.trim()) || !farmId) {
      setError("Nhập mã thiết bị hợp lệ và chọn trang trại.");
      return;
    }
    if (!/^[0-9A-Za-z]{5}-?[0-9A-Za-z]{5}$/.test(registerDraft.claimCode.trim())) {
      setError("Mã kích hoạt gồm 10 ký tự, ví dụ ABCDE-12345.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const response = await iotLifecycleApi.claimDevice({
        claimCode: registerDraft.claimCode.trim(),
        cultivationAreaId: registerDraft.cultivationAreaId || null,
        deviceUid: registerDraft.deviceUid.trim(),
        farmId,
        name: registerDraft.name.trim() || null,
      });
      setRegisterDraft({ claimCode: "", cultivationAreaId: "", deviceUid: "", farmId, name: "" });
      await loadDevices();
      setSelectedDeviceId(response.device.id);
    } catch (registerError) {
      setError(lifecycleMessage(registerError, "Không thể kích hoạt thiết bị. Vui lòng thử lại."));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitUpdateDevice() {
    if (!selectedDevice) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await iotApi.updateDevice(selectedDevice.id, {
        cultivationAreaId: editDraft.cultivationAreaId || null,
        farmId: editDraft.farmId,
        name: editDraft.name.trim() || null,
        status: editDraft.status,
      });
      await loadDevices();
      setSelectedDeviceId(response.device.id);
    } catch (updateError) {
      setError(messageFromError(updateError));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDeleteDevice() {
    if (!selectedDevice) return;
    setSubmitting(true);
    setError(null);
    try {
      await iotApi.deleteDevice(selectedDevice.id);
      await loadDevices();
      setSelectedDeviceId("");
      setLatest(null);
    } catch (deleteError) {
      setError(messageFromError(deleteError));
    } finally {
      setSubmitting(false);
    }
  }

  async function acknowledgeAlert(alertId: string) {
    setSubmitting(true);
    setError(null);
    try {
      await iotApi.acknowledgeAlert(alertId);
      await loadAlerts();
    } catch (ackError) {
      setError(messageFromError(ackError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[durianTheme.colors.moss]}
            onRefresh={refresh}
            refreshing={refreshing}
            tintColor={durianTheme.colors.moss}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <DurianScreenHeader
            eyebrow="GIÁM SÁT VƯỜN"
            icon={Activity}
            title="Giám sát cảm biến IoT"
            subtitle="Thiết bị và số liệu môi trường của vườn."
          />
          <View style={styles.toolbar}>
            <View style={styles.toolbarCopy}>
              <View style={[styles.liveDot, !latest && styles.liveDotMuted]} />
              <View>
                <Text style={styles.liveTitle}>
                  {selectedDevice ? selectedDevice.name : "Chưa có thiết bị"}
                </Text>
                <Text style={styles.liveMeta}>
                  {latest?.receivedAt ? `Cập nhật ${formatDateTime(latest.receivedAt)}` : "Chưa có dữ liệu"}
                </Text>
              </View>
            </View>
            <Pressable accessibilityLabel="Làm mới dữ liệu" onPress={refresh} style={styles.iconButton}>
              <RefreshCw color={durianTheme.colors.moss} size={19} />
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <AlertCircle color={durianTheme.colors.warning} size={20} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {devices.length > 0 ? (
          <FlatList
            contentContainerStyle={styles.horizontalList}
            data={devices}
            horizontal
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <DeviceChip
                active={item.id === selectedDevice?.id}
                device={item}
                onPress={() => setSelectedDeviceId(item.id)}
              />
            )}
            showsHorizontalScrollIndicator={false}
          />
        ) : (
          <EmptyCard
            body="Chưa có thiết bị cảm biến nào được gắn với vườn của bạn."
            title="Chưa có thiết bị khả dụng"
          />
        )}

        <DeviceManagementCard
          editDraft={editDraft}
          editZones={editZones}
          farms={farms}
          onChangeEdit={setEditDraft}
          onChangeRegister={setRegisterDraft}
          onDelete={submitDeleteDevice}
          onRegister={submitRegisterDevice}
          onUpdate={submitUpdateDevice}
          registerDraft={registerDraft}
          registerFarmId={selectedRegisterFarmId}
          registerZones={registerZones}
          selectedDevice={selectedDevice}
          submitting={submitting}
        />

        <AlertListCard alerts={alerts} error={alertsError} onAcknowledge={acknowledgeAlert} submitting={submitting} />

        <View style={styles.metricGrid}>
          {METRICS.map((metric) => (
            <MetricCard
              key={metric.key}
              metric={metric}
              value={!latest ? null : metric.key === "soil" ? soilMoistureOf(latest) : latest[metric.key]}
            />
          ))}
        </View>

        {selectedDevice ? <SensorAnalytics key={selectedDevice.id} deviceId={selectedDevice.id} refreshKey={analyticsKey} /> : null}

        {selectedDevice ? (
          <View style={styles.chartCard}>
            <SectionHeading title="Trạng thái thiết bị" />
            <DeviceDetail device={selectedDevice} latest={latest} />
          </View>
        ) : null}

        {selectedDevice ? <IotDeviceSettingsCard key={selectedDevice.id} deviceId={selectedDevice.id} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function DeviceChip({
  active,
  device,
  onPress,
}: {
  active: boolean;
  device: IotDevice;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.deviceChip, active && styles.deviceChipActive]}>
      <RadioTower color={active ? durianTheme.colors.white : durianTheme.colors.moss} size={18} />
      <Text style={[styles.deviceChipName, active && styles.deviceChipNameActive]}>{device.name}</Text>
      <Text style={[styles.deviceChipMeta, active && styles.deviceChipNameActive]}>
        {connectivityLabel(device.connectivityStatus)} · Vườn {shortFoundationId(device.farmId)}
      </Text>
    </Pressable>
  );
}

function AlertListCard({
  alerts,
  error,
  onAcknowledge,
  submitting,
}: {
  alerts?: IotAlert[] | null;
  error?: string | null;
  onAcknowledge: (alertId: string) => void;
  submitting: boolean;
}) {
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  return (
    <View style={styles.chartCard}>
      <SectionHeading caption="Cảnh báo đang mở từ thiết bị trong vườn" title="Cảnh báo IoT" />
      {error ? (
        <Text style={styles.errorText}>Không thể tải cảnh báo IoT: {error}</Text>
      ) : safeAlerts.length === 0 ? (
        <Text style={styles.emptyText}>Không có cảnh báo nào đang mở.</Text>
      ) : (
        safeAlerts.slice(0, 5).map((alert) => (
          <View key={alert.id} style={styles.alertRow}>
            <View style={styles.alertIcon}>
              <Bell color={durianTheme.colors.warning} size={18} />
            </View>
            <View style={styles.alertCopy}>
              <Text style={styles.alertTitle}>{alert.alertType}</Text>
              <Text style={styles.alertText}>{alert.deviceName} · {alert.message}</Text>
              <Text style={styles.alertMeta}>{alert.lastObservedAt ? formatDateTime(alert.lastObservedAt) : "Chưa rõ thời điểm"}</Text>
            </View>
            <Pressable disabled={submitting} onPress={() => onAcknowledge(alert.id)} style={styles.alertAckButton}>
              <Text style={styles.alertAckText}>Đã xem</Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

function DeviceManagementCard({
  editDraft,
  editZones,
  farms,
  onChangeEdit,
  onChangeRegister,
  onDelete,
  onRegister,
  onUpdate,
  registerDraft,
  registerFarmId,
  registerZones,
  selectedDevice,
  submitting,
}: {
  editDraft: { cultivationAreaId: string; farmId: string; name: string; status: MutableIotDeviceStatus };
  editZones: CareZoneOption[];
  farms: CareFarmOption[];
  onChangeEdit: (draft: { cultivationAreaId: string; farmId: string; name: string; status: MutableIotDeviceStatus }) => void;
  onChangeRegister: (draft: { claimCode: string; cultivationAreaId: string; deviceUid: string; farmId: string; name: string }) => void;
  onDelete: () => void;
  onRegister: () => void;
  onUpdate: () => void;
  registerDraft: { claimCode: string; cultivationAreaId: string; deviceUid: string; farmId: string; name: string };
  registerFarmId: string;
  registerZones: CareZoneOption[];
  selectedDevice: IotDevice | null;
  submitting: boolean;
}) {
  return (
    <View style={styles.chartCard}>
      <SectionHeading title="Thêm & gắn thiết bị" />
      {farms.length === 0 ? (
        <Text style={styles.emptyText}>Chưa có trang trại để gắn thiết bị.</Text>
      ) : (
        <>
          <TextInput
            autoCapitalize="none"
            onChangeText={(deviceUid) => onChangeRegister({ ...registerDraft, deviceUid })}
            placeholder="Mã thiết bị, ví dụ esp32-01"
            placeholderTextColor={durianTheme.colors.muted}
            style={styles.input}
            value={registerDraft.deviceUid}
          />
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={11}
            onChangeText={(claimCode) => onChangeRegister({ ...registerDraft, claimCode: claimCode.toUpperCase() })}
            placeholder="Mã kích hoạt, ví dụ ABCDE-12345"
            placeholderTextColor={durianTheme.colors.muted}
            style={styles.input}
            value={registerDraft.claimCode}
          />
          <TextInput
            onChangeText={(name) => onChangeRegister({ ...registerDraft, name })}
            placeholder="Tên hiển thị"
            placeholderTextColor={durianTheme.colors.muted}
            style={styles.input}
            value={registerDraft.name}
          />
          <OptionRow
            options={farms.map((farm) => ({ id: farm.farmId, label: farm.label }))}
            selectedId={registerFarmId}
            onSelect={(farmId) => onChangeRegister({ ...registerDraft, cultivationAreaId: "", farmId })}
          />
          <OptionRow
            emptyLabel="Không gắn khu"
            options={registerZones.map((zone) => ({ id: zone.zoneId, label: zone.label }))}
            selectedId={registerDraft.cultivationAreaId}
            onSelect={(cultivationAreaId) => onChangeRegister({ ...registerDraft, cultivationAreaId })}
          />
          <Pressable disabled={submitting} onPress={onRegister} style={styles.primaryButton}>
            <Settings color={durianTheme.colors.white} size={17} />
            <Text style={styles.primaryButtonText}>Kích hoạt thiết bị</Text>
          </Pressable>
        </>
      )}

      {selectedDevice ? (
        <View style={styles.managementDivider}>
          <Text style={styles.managementTitle}>Thiết bị đang chọn</Text>
          <Text style={styles.managementMeta}>{selectedDevice.deviceUid}</Text>
          <TextInput
            onChangeText={(name) => onChangeEdit({ ...editDraft, name })}
            placeholder="Tên thiết bị"
            placeholderTextColor={durianTheme.colors.muted}
            style={styles.input}
            value={editDraft.name}
          />
          <OptionRow
            options={farms.map((farm) => ({ id: farm.farmId, label: farm.label }))}
            selectedId={editDraft.farmId}
            onSelect={(farmId) => onChangeEdit({ ...editDraft, cultivationAreaId: "", farmId })}
          />
          <OptionRow
            emptyLabel="Không gắn khu"
            options={editZones.map((zone) => ({ id: zone.zoneId, label: zone.label }))}
            selectedId={editDraft.cultivationAreaId}
            onSelect={(cultivationAreaId) => onChangeEdit({ ...editDraft, cultivationAreaId })}
          />
          <OptionRow
            options={DEVICE_STATUSES.map((status) => ({ id: status, label: STATUS_LABELS[status] ?? status }))}
            selectedId={editDraft.status}
            onSelect={(status) => onChangeEdit({ ...editDraft, status: status as MutableIotDeviceStatus })}
          />
          <View style={styles.managementActions}>
            <Pressable disabled={submitting} onPress={onUpdate} style={styles.primaryButtonSmall}>
              <Save color={durianTheme.colors.white} size={16} />
              <Text style={styles.primaryButtonText}>Lưu</Text>
            </Pressable>
            <Pressable disabled={submitting} onPress={onDelete} style={styles.dangerButton}>
              <Trash2 color={durianTheme.colors.danger} size={16} />
              <Text style={styles.dangerButtonText}>Xóa thiết bị</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function OptionRow({
  emptyLabel,
  onSelect,
  options,
  selectedId,
}: {
  emptyLabel?: string;
  onSelect: (id: string) => void;
  options: Array<{ id: string; label: string }>;
  selectedId: string;
}) {
  const items = emptyLabel ? [{ id: "", label: emptyLabel }, ...options] : options;
  if (items.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroller}>
      <View style={styles.optionRow}>
        {items.map((item) => {
          const active = item.id === selectedId;
          return (
            <Pressable
              key={`${item.id || "empty"}-${item.label}`}
              onPress={() => onSelect(item.id)}
              style={[styles.optionChip, active && styles.optionChipActive]}
            >
              <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function MetricCard({
  metric,
  value,
}: {
  metric: (typeof METRICS)[number];
  value: number | null;
}) {
  const Icon = metric.icon;
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: metric.accent }]}>
        <Icon color={durianTheme.colors.mossDark} size={20} />
      </View>
      <Text style={styles.metricValue}>
        {formatMetricValue(value)}
        <Text style={styles.metricUnit}>{value === null ? "" : ` ${metric.unit}`}</Text>
      </Text>
      <Text style={styles.metricLabel}>{metric.label}</Text>
    </View>
  );
}

function DeviceDetail({
  device,
  latest,
}: {
  device: IotDevice;
  latest: IotTelemetryReading | null;
}) {
  return (
    <View style={styles.detailList}>
      <DetailRow label="Mã thiết bị" value={device.deviceUid} />
      <DetailRow label="Trang trại" value={device.farmId} />
      <DetailRow label="Khu canh tác" value={device.cultivationAreaId ?? "Không gắn khu"} />
      <DetailRow label="Trạng thái" value={STATUS_LABELS[device.status] ?? device.status} />
      <DetailRow label="Kết nối" value={connectivityLabel(device.connectivityStatus)} />
      <DetailRow label="Dữ liệu" value={device.telemetryState === "HAS_TELEMETRY" ? "Đã có số đo" : "Chưa có số đo"} />
      <DetailRow label="Thời điểm đo" value={latest?.measuredAt ? formatDateTime(latest.measuredAt) : "Chưa có"} />
      <DetailRow label="Thời điểm nhận" value={latest?.receivedAt ? formatDateTime(latest.receivedAt) : "Chưa có"} />
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function EmptyCard({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.emptyText}>{body}</Text>
    </View>
  );
}

function SectionHeading({ caption, title }: { caption?: string; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    </View>
  );
}

function formatMetricValue(value: number | null) {
  if (value === null) return "--";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không rõ";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Hoạt động", INACTIVE: "Tạm ngưng", MAINTENANCE: "Bảo trì" };

const CONNECTION_LABELS: Record<string, string> = {
  ONLINE: "Đang kết nối", STALE: "Dữ liệu đã cũ", OFFLINE: "Mất kết nối", INACTIVE: "Ngừng hoạt động", MAINTENANCE: "Đang bảo trì",
};

function connectivityLabel(status: string | null | undefined) {
  return CONNECTION_LABELS[status ?? ""] ?? "Chưa rõ kết nối";
}

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : "Không thể tải dữ liệu IoT.";
}

const styles = StyleSheet.create({
  alertAckButton: {
    alignItems: "center",
    backgroundColor: "#F4F3EC",
    borderRadius: 12,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  alertAckText: {
    color: durianTheme.colors.moss,
    fontSize: 11,
    fontWeight: "900",
  },
  alertCopy: { flex: 1, gap: 2 },
  alertIcon: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.warningSoft,
    borderRadius: durianTheme.radius.sm,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  alertMeta: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  alertRow: {
    alignItems: "center",
    borderTopColor: "#ECE8D8",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
  },
  alertText: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  alertTitle: {
    color: durianTheme.colors.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  chartCard: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    gap: 10,
    padding: 17,
  },
  content: { gap: durianTheme.spacing.lg, paddingBottom: 44 },
  detailLabel: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  detailList: { gap: 10, marginTop: 12 },
  detailRow: {
    borderBottomColor: "#ECE8D8",
    borderBottomWidth: 1,
    gap: 3,
    paddingBottom: 8,
  },
  detailValue: {
    color: durianTheme.colors.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  deviceChip: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    gap: 5,
    minHeight: 112,
    padding: 14,
    width: 180,
  },
  deviceChipActive: {
    backgroundColor: durianTheme.colors.moss,
    borderColor: durianTheme.colors.moss,
  },
  deviceChipMeta: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  deviceChipName: {
    color: durianTheme.colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  deviceChipNameActive: { color: durianTheme.colors.white },
  emptyText: {
    color: durianTheme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  errorCard: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.warningSoft,
    borderRadius: durianTheme.radius.md,
    flexDirection: "row",
    gap: 9,
    padding: 13,
  },
  errorText: {
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  headerBlock: { gap: 12 },
  horizontalList: { gap: 11, paddingHorizontal: 18 },
  iconButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  input: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.sm,
    borderWidth: 1,
    color: durianTheme.colors.ink,
    fontSize: 13,
    fontWeight: "700",
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  legendDot: { borderRadius: 5, height: 9, width: 9 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  legendRow: { flexDirection: "row", gap: 14, marginBottom: 4, marginTop: 12 },
  legendText: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
  },
  liveDot: {
    backgroundColor: durianTheme.colors.success,
    borderRadius: 6,
    height: 10,
    width: 10,
  },
  liveDotMuted: { backgroundColor: durianTheme.colors.warning },
  liveMeta: {
    color: durianTheme.colors.muted,
    ...durianTheme.typography.caption,
    marginTop: 1,
  },
  liveTitle: {
    color: durianTheme.colors.ink,
    ...durianTheme.typography.bodyStrong,
  },
  metricCard: {
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 142,
    padding: 13,
  },
  metricGrid: { flexDirection: "row", gap: 9 },
  metricIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    marginBottom: 11,
    width: 38,
  },
  metricLabel: {
    color: durianTheme.colors.ink,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 3,
  },
  metricUnit: { fontSize: 11, lineHeight: 16 },
  metricValue: {
    color: durianTheme.colors.moss,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 27,
  },
  managementActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
  },
  managementDivider: {
    borderTopColor: "#ECE8D8",
    borderTopWidth: 1,
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
  },
  managementMeta: {
    color: durianTheme.colors.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: -6,
  },
  managementTitle: {
    color: durianTheme.colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  optionChip: {
    backgroundColor: durianTheme.colors.surfaceSecondary,
    borderColor: durianTheme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  optionChipActive: {
    backgroundColor: durianTheme.colors.moss,
    borderColor: durianTheme.colors.moss,
  },
  optionChipText: {
    color: durianTheme.colors.ink,
    fontSize: 11,
    fontWeight: "800",
  },
  optionChipTextActive: { color: durianTheme.colors.white },
  optionRow: { flexDirection: "row", gap: 8, paddingRight: 10 },
  optionScroller: { marginVertical: 2 },
  primaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  primaryButtonSmall: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 14,
    flexDirection: "row",
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 13,
  },
  primaryButtonText: {
    color: durianTheme.colors.white,
    fontSize: 12,
    fontWeight: "900",
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.dangerSoft,
    borderColor: durianTheme.colors.danger,
    borderRadius: durianTheme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 13,
  },
  dangerButtonText: {
    color: durianTheme.colors.danger,
    fontSize: 12,
    fontWeight: "900",
  },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  sectionCaption: {
    color: durianTheme.colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 1,
  },
  sectionHeading: { paddingHorizontal: 1 },
  sectionTitle: {
    color: durianTheme.colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
  },
  svgWrap: { marginTop: 8 },
  toolbar: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.surface,
    borderColor: durianTheme.colors.border,
    borderRadius: durianTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    marginHorizontal: 18,
    padding: 12,
  },
  toolbarCopy: { alignItems: "center", flex: 1, flexDirection: "row", gap: 9 },
});
