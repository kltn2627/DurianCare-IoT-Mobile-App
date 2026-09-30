import { authorizedRequest } from "@/src/features/auth/authApi";

import type {
  ComplianceAssessment,
  CreateCultivationScheduleRequest,
  CultivationActivity,
  CultivationPlan,
  CultivationSchedule,
  SafeHarvestDateResponse,
  ScheduleTaskStatus,
} from "./cultivationTypes";

export async function listCultivationActivities(query = "") {
  const response = await authorizedRequest<CultivationActivity[]>({
    method: "GET",
    url: `/api/v1/cultivation-activities${query ? `?${query}` : ""}`,
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

export async function getCultivationPlan(id: string) {
  const response = await authorizedRequest<CultivationPlan>({
    method: "GET",
    url: `/api/v1/cultivation-plans/${encodeURIComponent(id)}`,
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

export async function getSafeHarvestDate(cultivationSeasonId: string) {
  const response = await authorizedRequest<SafeHarvestDateResponse>({
    method: "GET",
    url: `/api/v1/cultivation-seasons/${encodeURIComponent(cultivationSeasonId)}/safe-harvest-date`,
  });
  return response.data;
}

export async function assessCompliance(cultivationSeasonId: string, targetMarketCode: string) {
  const response = await authorizedRequest<ComplianceAssessment>({
    method: "POST",
    url: `/api/v1/cultivation-seasons/${encodeURIComponent(cultivationSeasonId)}/compliance-assessments`,
    data: { targetMarketCode },
  });
  return response.data;
}

export async function listCultivationSchedules(params?: {
  zoneId?: string;
  type?: string;
  status?: string;
}) {
  const qs = params
    ? Object.entries(params)
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
        .join("&")
    : "";
  const response = await authorizedRequest<CultivationSchedule[]>({
    method: "GET",
    url: `/api/cultivation-schedules${qs ? `?${qs}` : ""}`,
  });
  return response.data;
}

export async function createCultivationSchedule(req: CreateCultivationScheduleRequest) {
  const response = await authorizedRequest<CultivationSchedule>({
    method: "POST",
    url: "/api/cultivation-schedules",
    data: req,
  });
  return response.data;
}

export async function updateCultivationScheduleStatus(id: string, status: ScheduleTaskStatus) {
  const response = await authorizedRequest<CultivationSchedule>({
    method: "PATCH",
    url: `/api/cultivation-schedules/${encodeURIComponent(id)}/status`,
    data: { status },
  });
  return response.data;
}
