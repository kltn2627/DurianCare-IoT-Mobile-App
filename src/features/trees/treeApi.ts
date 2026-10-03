import { authorizedRequest } from "@/src/features/auth/authApi";
import type {
  CreateCarePlanRequest,
  CreateFarmRequest,
  CreateZoneRequest,
  FarmSummary,
  GenerateTreesRequest,
  GenerateTreesResult,
  PagedResponse,
  RecoveryEvaluationResponse,
  TreeCarePlan,
  TreeDetail,
  TreeDiagnosis,
  TreeSummary,
  ZoneDetail,
  ZoneSafetySummary,
  ZoneSummary,
} from "./treeTypes";

export async function createFarm(body: CreateFarmRequest): Promise<FarmSummary> {
  const res = await authorizedRequest<FarmSummary>({
    method: "POST",
    url: "/api/v1/farms",
    data: body,
  });
  return res.data;
}

export async function createZone(
  farmId: string,
  body: CreateZoneRequest,
): Promise<ZoneSummary> {
  const res = await authorizedRequest<ZoneSummary>({
    method: "POST",
    url: `/api/v1/farms/${encodeURIComponent(farmId)}/zones`,
    data: body,
  });
  return res.data;
}

export async function generateTrees(
  zoneId: string,
  body: GenerateTreesRequest,
): Promise<GenerateTreesResult> {
  const res = await authorizedRequest<GenerateTreesResult>({
    method: "POST",
    url: `/api/zones/${encodeURIComponent(zoneId)}/trees/generate`,
    data: body,
  });
  return res.data;
}

export async function listFarms(): Promise<FarmSummary[]> {
  const res = await authorizedRequest<FarmSummary[]>({
    method: "GET",
    url: "/api/farms",
  });
  return res.data;
}

export async function listZones(farmId: string): Promise<ZoneSummary[]> {
  const res = await authorizedRequest<ZoneSummary[]>({
    method: "GET",
    url: `/api/farms/${encodeURIComponent(farmId)}/zones`,
  });
  return res.data;
}

export async function getZone(zoneId: string): Promise<ZoneDetail> {
  const res = await authorizedRequest<ZoneDetail>({
    method: "GET",
    url: `/api/zones/${encodeURIComponent(zoneId)}`,
  });
  return res.data;
}

export async function listTrees(zoneId: string): Promise<TreeSummary[]> {
  const res = await authorizedRequest<TreeSummary[]>({
    method: "GET",
    url: `/api/zones/${encodeURIComponent(zoneId)}/trees`,
  });
  return res.data;
}

export async function getZoneSafety(zoneId: string): Promise<ZoneSafetySummary> {
  const res = await authorizedRequest<ZoneSafetySummary>({
    method: "GET",
    url: `/api/zones/${encodeURIComponent(zoneId)}/safety-summary`,
  });
  return res.data;
}

export async function getTree(treeId: string): Promise<TreeDetail> {
  const res = await authorizedRequest<TreeDetail>({
    method: "GET",
    url: `/api/trees/${encodeURIComponent(treeId)}`,
  });
  return res.data;
}

export async function listDiagnoses(
  treeId: string,
  page = 0,
  size = 20,
): Promise<PagedResponse<TreeDiagnosis>> {
  const res = await authorizedRequest<PagedResponse<TreeDiagnosis>>({
    method: "GET",
    url: `/api/trees/${encodeURIComponent(treeId)}/diagnoses?page=${page}&size=${size}`,
  });
  return res.data;
}

export async function updateTreeHealthStatus(
  treeId: string,
  healthStatus: "TREATING" | "RECOVERED",
): Promise<TreeDetail> {
  const res = await authorizedRequest<TreeDetail>({
    method: "PATCH",
    url: `/api/trees/${encodeURIComponent(treeId)}/health-status`,
    data: { healthStatus },
  });
  return res.data;
}

export async function saveDiagnosis(
  treeId: string,
  body: {
    imageUrl: string;
    diseaseCode: string;
    diseaseName?: string | null;
    confidence?: number | null;
    boundingBox?: Record<string, unknown> | null;
    source?: string | null;
  },
): Promise<TreeDiagnosis> {
  const res = await authorizedRequest<TreeDiagnosis>({
    method: "POST",
    url: `/api/trees/${encodeURIComponent(treeId)}/diagnoses`,
    data: body,
  });
  return res.data;
}

export async function listCarePlans(treeId: string): Promise<TreeCarePlan[]> {
  const res = await authorizedRequest<TreeCarePlan[]>({
    method: "GET",
    url: `/api/trees/${encodeURIComponent(treeId)}/care-plans`,
  });
  return res.data;
}

export async function createCarePlan(
  treeId: string,
  body: CreateCarePlanRequest,
): Promise<TreeCarePlan> {
  const res = await authorizedRequest<TreeCarePlan>({
    method: "POST",
    url: `/api/trees/${encodeURIComponent(treeId)}/care-plans`,
    data: body,
  });
  return res.data;
}

export async function evaluateRecovery(treeId: string): Promise<RecoveryEvaluationResponse> {
  const res = await authorizedRequest<RecoveryEvaluationResponse>({
    method: "POST",
    url: `/api/trees/${encodeURIComponent(treeId)}/evaluate-recovery`,
  });
  return res.data;
}
