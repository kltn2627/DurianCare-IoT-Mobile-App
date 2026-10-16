export type IotTelemetryUnits = {
  humidity: "%";
  light: "raw";
  temperature: "°C";
};

export type IotTelemetryReading = {
  deviceUid: string;
  humidity: number | null;
  id: string;
  light: number | null;
  measuredAt: string | null;
  receivedAt: string | null;
  temperature: number | null;
  units: IotTelemetryUnits;
};

export type IotDeviceStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "DELETED" | string;
export type IotConnectivityStatus = "ONLINE" | "STALE" | "OFFLINE" | "UNKNOWN" | string;
export type IotTelemetryState = "HAS_TELEMETRY" | "NEVER_REPORTED" | string;
export type MutableIotDeviceStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export type IotConnectivity = {
  ageSeconds?: number;
  basis: string;
  expectedTelemetryIntervalSeconds?: number;
  lastTelemetryAt: string | null;
  offlineAfterSeconds?: number;
  staleAfterSeconds?: number;
  status: IotConnectivityStatus;
  suppressesOfflineAlert?: boolean;
};

export type IotDevice = {
  cultivationAreaId: string | null;
  administrativeStatus?: IotDeviceStatus;
  connectivity?: IotConnectivity;
  connectivityStatus?: IotConnectivityStatus;
  deviceUid: string;
  farmId: string;
  id: string;
  lastSeenAt: string | null;
  latestTelemetry: IotTelemetryReading | null;
  name: string;
  status: IotDeviceStatus;
  telemetryState: IotTelemetryState;
};

export type IotDeviceSummary = Omit<IotDevice, "latestTelemetry">;

export type IotDeviceListResponse = {
  devices: IotDevice[];
};

export type IotDeviceResponse = {
  device: IotDevice;
};

export type IotAlertStatus = "ALERTING" | "RECOVERED" | "ACKNOWLEDGED" | string;

export type IotAlert = {
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  alertType: string;
  cultivationAreaId: string | null;
  deviceId: string | null;
  deviceName: string;
  deviceUid: string;
  farmId: string;
  id: string;
  lastObservedAt: string | null;
  measuredValue: number | null;
  message: string;
  recoveredAt: string | null;
  startedAt: string | null;
  status: IotAlertStatus;
  thresholdValue: number | null;
};

export type IotAlertListResponse = {
  alerts: IotAlert[];
};

export type IotAlertResponse = {
  alert: IotAlert;
};

export type IotDeviceMutationRequest = {
  cultivationAreaId?: string | null;
  deviceUid?: string;
  farmId?: string;
  name?: string | null;
  status?: MutableIotDeviceStatus;
};

export type IotTelemetryLatestResponse = {
  device: IotDeviceSummary;
  telemetry: IotTelemetryReading | null;
};

export type IotTelemetryHistoryResponse = {
  device: IotDeviceSummary;
  range: {
    from: string;
    limit: number;
    resolution: "raw" | string;
    to: string;
  };
  telemetry: IotTelemetryReading[];
};
