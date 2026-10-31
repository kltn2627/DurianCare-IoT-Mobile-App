import { authorizedRequest } from "@/src/features/auth/authApi";

export type ZoneYieldForecast = {
  seasonId: string;
  zoneId: string;
  totalTrees: number;
  observedTrees: number;
  unobservedTrees: number;
  unforecastableObservedTrees: number;
  forecastableTrees: number;
  totalFruitCount: number;
  estimatedYieldKg: number;
  expectedPricePerKg?: number | null;
  currencyCode?: string | null;
  estimatedRevenue?: number | null;
  historyAvailable: boolean;
  previousSeasonActualYieldKg?: number | null;
  historicalAverageYieldKg?: number | null;
  historicalAverageFruitWeightKg?: number | null;
  suggestedAverageFruitWeightKg?: number | null;
  differenceFromHistoricalAveragePercent?: number | null;
  trees?: TreeYieldForecast[];
};

export type TreeYieldForecast = { treeId: string; treeCode: string; fruitCount?: number | null; averageFruitWeightKgUsed?: number | null; averageWeightSource?: string | null; estimatedYieldKg?: number | null; lastObservedAt?: string | null; forecastable: boolean };
export type TreeYieldObservation = { id: string; treeId: string; seasonId: string; fruitCount: number; averageFruitWeightKgOverride?: number | null; observedAt: string; note?: string | null };
export type SeasonYieldHistory = { seasonId: string; seasonName: string; zoneId: string; actualFruitCount?: number | null; actualYieldKg?: number | null; actualAverageFruitWeightKg?: number | null; actualAverageSellingPricePerKg?: number | null; actualRevenue?: number | null; finalHarvestDate?: string | null; dataType: string };

/** The backend is the calculation authority; Mobile only renders its response. */
export async function getZoneYieldForecast(seasonId: string, zoneId: string): Promise<ZoneYieldForecast> {
  const response = await authorizedRequest<ZoneYieldForecast>({
    method: "GET",
    url: `/api/v1/cultivation-seasons/${encodeURIComponent(seasonId)}/zones/${encodeURIComponent(zoneId)}/yield-forecast`,
  });
  return response.data;
}

export async function listTreeYieldObservations(treeId: string, seasonId: string): Promise<TreeYieldObservation[]> {
  const response = await authorizedRequest<TreeYieldObservation[]>({ method: "GET", url: `/api/v1/trees/${encodeURIComponent(treeId)}/yield-observations?seasonId=${encodeURIComponent(seasonId)}` });
  return response.data;
}

export async function createTreeYieldObservation(treeId: string, body: { seasonId: string; zoneId: string; fruitCount: number; averageFruitWeightKgOverride?: number; note?: string }): Promise<TreeYieldObservation> {
  const response = await authorizedRequest<TreeYieldObservation>({ method: "POST", url: `/api/v1/trees/${encodeURIComponent(treeId)}/yield-observations`, data: body });
  return response.data;
}

export async function updateYieldForecastSettings(seasonId: string, zoneId: string, body: { expectedPricePerKg?: number; currencyCode?: string; defaultAverageFruitWeightKg?: number }): Promise<void> {
  await authorizedRequest({ method: "PUT", url: `/api/v1/cultivation-seasons/${encodeURIComponent(seasonId)}/zones/${encodeURIComponent(zoneId)}/yield-forecast-settings`, data: body });
}

export async function getSeasonYieldHistory(seasonId: string, zoneId: string): Promise<SeasonYieldHistory[]> {
  const response = await authorizedRequest<SeasonYieldHistory[]>({ method: "GET", url: `/api/v1/cultivation-seasons/${encodeURIComponent(seasonId)}/zones/${encodeURIComponent(zoneId)}/yield-history` });
  return response.data;
}
