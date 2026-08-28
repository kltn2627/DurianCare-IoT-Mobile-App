import { getCachedAuthTokens } from "@/src/features/auth/authTokenStore";
import { getApiBaseUrl } from "./apiBase";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SensorLatest = {
  device_id:    string;
  temperature:  number | null;
  air_humidity: number | null;
  soil_moisture: number | null;
  status:       string | null;
  timestamp:    string;
};

export type SensorHistoryPoint = {
  device_id:    string;
  temperature:  number | null;
  air_humidity: number | null;
  soil_moisture: number | null;
  timestamp:    string;
};

export type CameraCapture = {
  id:              string;
  device_id:       string;
  image_url:       string;
  capture_type:    "MANUAL" | "SCHEDULED";
  captured_at:     string;
  ai_status:       "PROCESSING" | "COMPLETED" | "FAILED" | null;
  disease_detected: string | null;
  confidence_score: number | null;
  diagnosis_result: Record<string, unknown> | null;
  notes:            string | null;
};

export type ExportAssessment = {
  id:                 string;
  overall_score:      number;
  residue_score:      number;
  env_score:          number;
  disease_score:      number;
  phi_score:          number;
  soil_score:         number;
  days_until_harvest: number;
  target_market:      string;
  market_label:       string;
  assessed_at:        string;
  risk_summary:       RiskItem[];
  recommendations:    Recommendation[];
  criteria:           CriterionScore[];
};

export type RiskItem = {
  chemical_id:    string;
  name:           string;
  severity:       "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  message:        string;
  phi_remaining:  number;
  estimated_ppm:  number;
  mrl_ppm:        number | null;
};

export type Recommendation = {
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  text:     string;
};

export type CriterionScore = {
  key:    string;
  label:  string;
  score:  number;
  weight: number;
};

export type ChemicalApplication = {
  chemical_id:    string;
  applied_at:     string;
  dose_kg_per_ha: number;
};

export type TargetMarket = "CHINA" | "EU" | "US" | "JAPAN" | "DOMESTIC";

// ── Fetch wrapper ─────────────────────────────────────────────────────────────

async function iotFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base   = getApiBaseUrl();
  const tokens = getCachedAuthTokens();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (tokens?.accessToken) {
    headers["Authorization"] = `Bearer ${tokens.accessToken}`;
  }

  const res  = await fetch(`${base}${path}`, { ...init, headers });
  const text = await res.text().catch(() => "");
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.error ?? `API error ${res.status}`);
  return json as T;
}

// ── Sensor API ────────────────────────────────────────────────────────────────

export async function fetchSensorLatest(deviceId: string): Promise<SensorLatest> {
  return iotFetch<SensorLatest>(
    `/api/v1/sensors/latest?device_id=${encodeURIComponent(deviceId)}`
  );
}

export async function fetchSensorHistory(params: {
  device_id: string;
  limit?:    number;
  from?:     string;
  to?:       string;
}): Promise<{ data: SensorHistoryPoint[] }> {
  const q = new URLSearchParams({ device_id: params.device_id });
  if (params.limit) q.set("limit", String(params.limit));
  if (params.from)  q.set("from",  params.from);
  if (params.to)    q.set("to",    params.to);
  return iotFetch<{ data: SensorHistoryPoint[] }>(
    `/api/v1/sensors/history?${q.toString()}`
  );
}

// ── Camera API ────────────────────────────────────────────────────────────────

export async function captureNow(deviceId: string): Promise<CameraCapture> {
  return iotFetch<CameraCapture>(
    `/api/v1/camera/capture-now?device_id=${encodeURIComponent(deviceId)}`,
    { method: "POST", body: JSON.stringify({ device_id: deviceId }) }
  );
}

export async function fetchCameraHistory(params: {
  device_id?: string;
  limit?:     number;
}): Promise<{ data: CameraCapture[] }> {
  const q = new URLSearchParams();
  if (params.device_id) q.set("device_id", params.device_id);
  if (params.limit)     q.set("limit", String(params.limit));
  return iotFetch<{ data: CameraCapture[] }>(
    `/api/v1/camera/history?${q.toString()}`
  );
}

export function getSnapshotUrl(deviceId: string): string {
  const base = getApiBaseUrl();
  return `${base}/api/v1/camera/snapshot?device_id=${encodeURIComponent(deviceId)}`;
}

// ── Export Assessment API ─────────────────────────────────────────────────────

export type BatchStatus = "PLANNED" | "GROWING" | "HARVESTING" | "EVALUATING" | "EXPORTED";

export type FarmingBatch = {
  id:                    string;
  batch_code:            string;
  device_id:             string;
  cam_device_id:         string | null;
  variety:               string | null;
  farm_name:             string | null;
  start_date:            string;
  harvest_date:          string | null;
  target_market:         TargetMarket;
  notes:                 string | null;
  chemical_applications: ChemicalApplication[];
  status:                BatchStatus;
  traceability_code:     string | null;
  export_score:          number | null;
  finalized_at:          string | null;
};

export type FinalizeResult = {
  id:                string;
  batch_code:        string;
  status:            BatchStatus;
  traceability_code: string;
  export_score:      number | null;
  finalized_at:      string;
  traceability_url:  string;
};

export type PublicTraceData = {
  traceability_code: string;
  farm: {
    name:          string;
    variety:       string;
    target_market: TargetMarket;
    batch_code:    string;
    start_date:    string;
    harvest_date:  string | null;
    finalized_at:  string | null;
  };
  export_score:  number | null;
  certification: { status: string; standards: string[] };
  chemical_log:  { chemical_id: string; applied_at: string; dose_kg_per_ha: number; stage: string | null }[];
  assessment_summary: {
    overall_score: number;
    residue_score: number;
    env_score:     number;
    disease_score: number;
    assessed_at:   string;
  } | null;
  env_averages: {
    avg_temperature:   number | null;
    avg_humidity:      number | null;
    avg_soil_moisture: number | null;
    reading_count:     number;
  } | null;
};

export async function fetchBatches(): Promise<{ batches: FarmingBatch[] }> {
  return iotFetch("/api/v1/export-assessment/batches");
}

export async function runExportAssessment(params: {
  device_id?:             string;
  target_market?:         TargetMarket;
  harvest_date?:          string;
  chemical_applications?: ChemicalApplication[];
  batch_id?:              string;
}): Promise<ExportAssessment> {
  return iotFetch<ExportAssessment>("/api/v1/export-assessment/evaluate", {
    method: "POST",
    body:   JSON.stringify(params),
  });
}

export async function fetchChemicals(): Promise<{ chemicals: { id: string; name: string; phiDays: number }[] }> {
  return iotFetch("/api/v1/export-assessment/chemicals");
}

export async function updateBatchStatus(
  id: string,
  status: BatchStatus,
): Promise<{ id: string; batch_code: string; status: BatchStatus }> {
  return iotFetch(`/api/v1/export-assessment/batches/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body:   JSON.stringify({ status }),
  });
}

export async function finalizeBatch(id: string): Promise<FinalizeResult> {
  return iotFetch(`/api/v1/export-assessment/batches/${encodeURIComponent(id)}/finalize`, {
    method: "POST",
  });
}

export async function fetchPublicTrace(code: string): Promise<PublicTraceData> {
  const base = getApiBaseUrl();
  const res  = await fetch(`${base}/api/v1/public/traceability/${encodeURIComponent(code)}`);
  const text = await res.text().catch(() => "");
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.error ?? "Không tìm thấy hồ sơ truy xuất");
  return json as PublicTraceData;
}
