import { authorizedRequest } from "@/src/features/auth/authApi";
import type {
  FarmSummary,
  PagedResponse,
  TreeDetail,
  TreeDiagnosis,
  TreeSummary,
  ZoneDetail,
  ZoneSafetySummary,
  ZoneSummary,
} from "./treeTypes";

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
