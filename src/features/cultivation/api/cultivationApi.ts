import { authorizedRequest } from "@/src/features/auth/authApi";

import type {
  ComplianceAssessment,
  CultivationActivity,
  CultivationPlan,
  SafeHarvestDateResponse,
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
