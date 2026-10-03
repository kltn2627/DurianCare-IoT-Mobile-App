import { authorizedRequest } from "@/src/features/auth/authApi";

import type {
  AgriculturalInput,
  ApproveCultivationActivityRequest,
  AuthorizedFarm,
  CareHistoryResponse,
  ComplianceAssessment,
  CompleteCultivationActivityRequest,
  CompleteCultivationActivityResponse,
  CreateCultivationSeasonRequest,
  CreateExportReleaseRequest,
  CreateFarmRequest,
  CreateFarmZoneRequest,
  CreateCultivationActivityRequest,
  CreateHarvestBatchRequest,
  CreateCultivationPlanRequest,
  CultivationSeason,
  CultivationActivity,
  CultivationPlan,
  ExportRelease,
  ExportReleaseStatus,
  HarvestBatch,
  FarmCatalog,
  FarmZoneCatalog,
  LabSample,
  RejectCultivationActivityRequest,
  ResidueStandard,
  SafeHarvestDateResponse,
  TraceabilityResponse,
  UpdateCultivationActivityRequest,
  UpdateCultivationSeasonRequest,
  UpdateFarmRequest,
  UpdateFarmZoneRequest,
} from "./cultivationTypes";

type QueryValue = string | number | boolean | null | undefined;

function queryString(query?: Record<string, QueryValue>) {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export async function listAuthorizedFarms() {
  const response = await authorizedRequest<AuthorizedFarm[]>({
    method: "GET",
    url: "/api/v1/me/authorized-farms",
  });
  return response.data;
}

export async function listOwnedFarms() {
  const response = await authorizedRequest<FarmCatalog[]>({
    method: "GET",
    url: "/api/v1/farms",
  });
  return response.data;
}

export async function createOwnedFarm(body: CreateFarmRequest) {
  const response = await authorizedRequest<FarmCatalog>({
    data: body,
    method: "POST",
    url: "/api/v1/farms",
  });
  return response.data;
}

export async function getOwnedFarm(farmId: string) {
  const response = await authorizedRequest<FarmCatalog>({
    method: "GET",
    url: `/api/v1/farms/${encodeURIComponent(farmId)}`,
  });
  return response.data;
}

export async function updateOwnedFarm(farmId: string, body: UpdateFarmRequest) {
  const response = await authorizedRequest<FarmCatalog>({
    data: body,
    method: "PATCH",
    url: `/api/v1/farms/${encodeURIComponent(farmId)}`,
  });
  return response.data;
}

export async function archiveOwnedFarm(farmId: string) {
  await authorizedRequest<void>({
    method: "DELETE",
    url: `/api/v1/farms/${encodeURIComponent(farmId)}`,
  });
}

export async function listFarmZones(farmId: string) {
  const response = await authorizedRequest<FarmZoneCatalog[]>({
    method: "GET",
    url: `/api/v1/farms/${encodeURIComponent(farmId)}/zones`,
  });
  return response.data;
}

export async function createFarmZone(farmId: string, body: CreateFarmZoneRequest) {
  const response = await authorizedRequest<FarmZoneCatalog>({
    data: body,
    method: "POST",
    url: `/api/v1/farms/${encodeURIComponent(farmId)}/zones`,
  });
  return response.data;
}

export async function updateFarmZone(
  farmId: string,
  zoneId: string,
  body: UpdateFarmZoneRequest,
) {
  const response = await authorizedRequest<FarmZoneCatalog>({
    data: body,
    method: "PATCH",
    url: `/api/v1/farms/${encodeURIComponent(farmId)}/zones/${encodeURIComponent(zoneId)}`,
  });
  return response.data;
}

export async function archiveFarmZone(farmId: string, zoneId: string) {
  await authorizedRequest<void>({
    method: "DELETE",
    url: `/api/v1/farms/${encodeURIComponent(farmId)}/zones/${encodeURIComponent(zoneId)}`,
  });
}

export async function listCultivationSeasons(query: { farmId: string; plotId?: string }) {
  const queryText = queryString(query);
  const response = await authorizedRequest<CultivationSeason[]>({
    method: "GET",
    url: `/api/v1/cultivation-seasons?${queryText}`,
  });
  return response.data;
}

export async function createCultivationSeason(body: CreateCultivationSeasonRequest) {
  const response = await authorizedRequest<CultivationSeason>({
    data: body,
    method: "POST",
    url: "/api/v1/cultivation-seasons",
  });
  return response.data;
}

export async function updateCultivationSeason(id: string, body: UpdateCultivationSeasonRequest) {
  const response = await authorizedRequest<CultivationSeason>({
    data: body,
    method: "PATCH",
    url: `/api/v1/cultivation-seasons/${encodeURIComponent(id)}`,
  });
  return response.data;
}

export async function listCultivationPlans(query?: {
  cultivationSeasonId?: string;
  farmId?: string;
  plotId?: string;
}) {
  const queryText = queryString(query);
  const response = await authorizedRequest<CultivationPlan[]>({
    method: "GET",
    url: `/api/v1/cultivation-plans${queryText ? `?${queryText}` : ""}`,
  });
  return response.data;
}

export async function createCultivationPlan(body: CreateCultivationPlanRequest) {
  const response = await authorizedRequest<CultivationPlan>({
    data: body,
    method: "POST",
    url: "/api/v1/cultivation-plans",
  });
  return response.data;
}

export async function listCultivationActivities(query?: {
  activityType?: string;
  cultivationSeasonId?: string;
  status?: string;
}) {
  const queryText = typeof query === "string" ? query : queryString(query);
  const response = await authorizedRequest<CultivationActivity[]>({
    method: "GET",
    url: `/api/v1/cultivation-activities${queryText ? `?${queryText}` : ""}`,
  });
  return response.data;
}

export async function getCultivationActivity(id: string) {
  const response = await authorizedRequest<CultivationActivity>({
    method: "GET",
    url: `/api/v1/cultivation-activities/${encodeURIComponent(id)}`,
  });
  return response.data;
}

export async function createCultivationActivity(body: CreateCultivationActivityRequest) {
  const response = await authorizedRequest<CultivationActivity>({
    data: body,
    method: "POST",
    url: "/api/v1/cultivation-activities",
  });
  return response.data;
}

export async function updateCultivationActivity(
  id: string,
  body: UpdateCultivationActivityRequest,
) {
  const response = await authorizedRequest<CultivationActivity>({
    data: body,
    method: "PATCH",
    url: `/api/v1/cultivation-activities/${encodeURIComponent(id)}`,
  });
  return response.data;
}

export async function approveCultivationActivity(
  id: string,
  body: ApproveCultivationActivityRequest,
) {
  const response = await authorizedRequest<CultivationActivity>({
    data: body,
    method: "POST",
    url: `/api/v1/cultivation-activities/${encodeURIComponent(id)}/approve`,
  });
  return response.data;
}

export async function rejectCultivationActivity(
  id: string,
  body: RejectCultivationActivityRequest,
) {
  const response = await authorizedRequest<CultivationActivity>({
    data: body,
    method: "POST",
    url: `/api/v1/cultivation-activities/${encodeURIComponent(id)}/reject`,
  });
  return response.data;
}

export async function startCultivationActivity(id: string) {
  const response = await authorizedRequest<CultivationActivity>({
    method: "POST",
    url: `/api/v1/cultivation-activities/${encodeURIComponent(id)}/start`,
  });
  return response.data;
}

export async function completeCultivationActivity(
  id: string,
  body: CompleteCultivationActivityRequest,
) {
  const response = await authorizedRequest<CompleteCultivationActivityResponse>({
    data: body,
    method: "POST",
    url: `/api/v1/cultivation-activities/${encodeURIComponent(id)}/complete`,
  });
  return response.data;
}

export async function skipCultivationActivity(id: string) {
  const response = await authorizedRequest<CultivationActivity>({
    method: "POST",
    url: `/api/v1/cultivation-activities/${encodeURIComponent(id)}/skip`,
  });
  return response.data;
}

export async function cancelCultivationActivity(id: string) {
  const response = await authorizedRequest<CultivationActivity>({
    method: "POST",
    url: `/api/v1/cultivation-activities/${encodeURIComponent(id)}/cancel`,
  });
  return response.data;
}

export async function getCultivationPlan(id: string) {
  const response = await authorizedRequest<CultivationPlan>({
    method: "GET",
    url: `/api/v1/cultivation-plans/${encodeURIComponent(id)}`,
  });
  return response.data;
}

export async function listAgriculturalInputs(query?: {
  biologicalLevel?: string;
  status?: string;
}) {
  const queryText = queryString(query);
  const response = await authorizedRequest<AgriculturalInput[]>({
    method: "GET",
    url: `/api/v1/agricultural-inputs${queryText ? `?${queryText}` : ""}`,
  });
  return response.data;
}

export async function getCultivationPlanCalendar(id: string) {
  const response = await authorizedRequest<CultivationActivity[]>({
    method: "GET",
    url: `/api/v1/cultivation-plans/${encodeURIComponent(id)}/calendar`,
  });
  return response.data;
}

export async function getCareHistory(cultivationSeasonId: string) {
  const response = await authorizedRequest<CareHistoryResponse>({
    method: "GET",
    url: `/api/v1/cultivation-seasons/${encodeURIComponent(cultivationSeasonId)}/care-history`,
  });
  return response.data;
}

export async function getChemicalHistory(cultivationSeasonId: string) {
  const response = await authorizedRequest<CultivationActivity[]>({
    method: "GET",
    url: `/api/v1/cultivation-seasons/${encodeURIComponent(cultivationSeasonId)}/chemical-history`,
  });
  return response.data;
}

export async function getSafeHarvestDate(cultivationSeasonId: string) {
  const response = await authorizedRequest<string | null>({
    method: "GET",
    url: `/api/v1/cultivation-seasons/${encodeURIComponent(cultivationSeasonId)}/safe-harvest-date`,
  });
  return {
    cultivationSeasonId,
    earliestSafeHarvestDate: response.data,
  } satisfies SafeHarvestDateResponse;
}

export async function assessCompliance(
  cultivationSeasonId: string,
  targetMarketCode: string,
  harvestBatchId?: string,
) {
  const response = await authorizedRequest<ComplianceAssessment>({
    data: { harvestBatchId, targetMarketCode },
    method: "POST",
    url: `/api/v1/cultivation-seasons/${encodeURIComponent(cultivationSeasonId)}/compliance-assessments`,
  });
  return response.data;
}

export async function listResidueStandards(query?: {
  activeIngredientCode?: string;
  commodityCode?: string;
  marketCode?: string;
}) {
  const queryText = queryString(query);
  const response = await authorizedRequest<ResidueStandard[]>({
    method: "GET",
    url: `/api/v1/residue-standards${queryText ? `?${queryText}` : ""}`,
  });
  return response.data;
}

export async function listLabSamples(query?: {
  cultivationSeasonId?: string;
  harvestBatchId?: string;
}) {
  const queryText = queryString(query);
  const response = await authorizedRequest<LabSample[]>({
    method: "GET",
    url: `/api/v1/lab-samples${queryText ? `?${queryText}` : ""}`,
  });
  return response.data;
}

export async function listHarvestBatches(query?: {
  cultivationSeasonId?: string;
  farmId?: string;
  plotId?: string;
}) {
  const queryText = queryString(query);
  const response = await authorizedRequest<HarvestBatch[]>({
    method: "GET",
    url: `/api/v1/harvest-batches${queryText ? `?${queryText}` : ""}`,
  });
  return response.data;
}

export async function getHarvestBatch(id: string) {
  const response = await authorizedRequest<HarvestBatch>({
    method: "GET",
    url: `/api/v1/harvest-batches/${encodeURIComponent(id)}`,
  });
  return response.data;
}

export async function createHarvestBatch(body: CreateHarvestBatchRequest) {
  const response = await authorizedRequest<HarvestBatch>({
    data: body,
    method: "POST",
    url: "/api/v1/harvest-batches",
  });
  return response.data;
}

export async function assessExportRelease(harvestBatchId: string, targetMarketCode: string) {
  const response = await authorizedRequest<ComplianceAssessment>({
    data: { harvestBatchId, targetMarketCode },
    method: "POST",
    url: "/api/v1/export-releases/assess",
  });
  return response.data;
}

export async function listExportReleases(query?: {
  harvestBatchId?: string;
  status?: ExportReleaseStatus;
  targetMarketCode?: string;
}) {
  const queryText = queryString(query);
  const response = await authorizedRequest<ExportRelease[]>({
    method: "GET",
    url: `/api/v1/export-releases${queryText ? `?${queryText}` : ""}`,
  });
  return response.data;
}

export async function getExportRelease(id: string) {
  const response = await authorizedRequest<ExportRelease>({
    method: "GET",
    url: `/api/v1/export-releases/${encodeURIComponent(id)}`,
  });
  return response.data;
}

export async function createExportRelease(body: CreateExportReleaseRequest) {
  const response = await authorizedRequest<ExportRelease>({
    data: body,
    method: "POST",
    url: "/api/v1/export-releases",
  });
  return response.data;
}

export async function submitExportRelease(id: string, userId: string) {
  const response = await authorizedRequest<ExportRelease>({
    data: { userId },
    method: "POST",
    url: `/api/v1/export-releases/${encodeURIComponent(id)}/submit`,
  });
  return response.data;
}

export async function approveExportRelease(id: string, userId: string) {
  const response = await authorizedRequest<ExportRelease>({
    data: { userId },
    method: "POST",
    url: `/api/v1/export-releases/${encodeURIComponent(id)}/approve`,
  });
  return response.data;
}

export async function releaseExportRelease(id: string, userId: string) {
  const response = await authorizedRequest<ExportRelease>({
    data: { userId },
    method: "POST",
    url: `/api/v1/export-releases/${encodeURIComponent(id)}/release`,
  });
  return response.data;
}

export async function recallExportRelease(id: string, userId: string, reason: string) {
  const response = await authorizedRequest<ExportRelease>({
    data: { reason, userId },
    method: "POST",
    url: `/api/v1/export-releases/${encodeURIComponent(id)}/recall`,
  });
  return response.data;
}

export async function getExportReleaseTraceability(id: string) {
  const response = await authorizedRequest<TraceabilityResponse>({
    method: "GET",
    url: `/api/v1/export-releases/${encodeURIComponent(id)}/traceability`,
  });
  return response.data;
}
