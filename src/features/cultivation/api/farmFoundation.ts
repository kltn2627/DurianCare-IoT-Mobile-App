import type {
  AuthorizedFarm,
  CareFarmOption,
  CareSeasonOption,
  CareZoneOption,
  CultivationSeason,
  CultivationActivity,
  FarmCatalog,
  CultivationPlan,
} from "@/src/features/cultivation/api/cultivationTypes";

export type CareFoundationData = {
  activities: CultivationActivity[];
  authorizedFarms: AuthorizedFarm[];
  ownedFarms?: FarmCatalog[];
  plans: CultivationPlan[];
  seasons?: CultivationSeason[];
};

export type CareFoundationSelection = { farmId: string; seasonId: string; zoneId: string };

export const emptyFoundationSelection: CareFoundationSelection = { farmId: "", seasonId: "", zoneId: "" };

export function shortFoundationId(id: string) {
  return id.length <= 8 ? id : `${id.slice(0, 4)}...${id.slice(-4)}`;
}

function seasonLabelFromPlan(plan: CultivationPlan) {
  const year = plan.startDate ? new Date(`${plan.startDate}T00:00:00`).getFullYear() : NaN;
  return Number.isFinite(year) ? `Vụ mùa ${year}` : `Season ${shortFoundationId(plan.cultivationSeasonId)}`;
}

export function buildFoundationFarmOptions(data: CareFoundationData): CareFarmOption[] {
  const options = new Map<string, CareFarmOption>();
  data.ownedFarms?.forEach((farm) => {
    options.set(farm.id, {
      farmId: farm.id,
      label: farm.name?.trim() || `Farm ${shortFoundationId(farm.id)}`,
      ownerId: farm.ownerUserId,
      permissions: [],
      source: "OWNED",
      zoneIds: farm.zones?.map((zone) => zone.id) ?? [],
    });
  });
  data.authorizedFarms.forEach((farm) => {
    if (options.has(farm.farmId)) return;
    options.set(farm.farmId, {
      farmId: farm.farmId,
      label: farm.farmName?.trim() || `Farm ${shortFoundationId(farm.farmId)}`,
      ownerId: farm.ownerId,
      permissions: farm.permissions ?? [],
      source: "AUTHORIZED",
      zoneIds: farm.allowedCultivationAreaIds ?? [],
    });
  });
  [...data.plans, ...data.activities].forEach((item) => {
    if (options.has(item.farmId)) return;
    options.set(item.farmId, {
      farmId: item.farmId,
      label: `Farm ${shortFoundationId(item.farmId)}`,
      ownerId: null,
      permissions: [],
      source: "CULTIVATION_DATA",
      zoneIds: [],
    });
  });
  return Array.from(options.values());
}

export function buildFoundationZoneOptions(data: CareFoundationData, farmId: string): CareZoneOption[] {
  if (!farmId) return [];
  const options = new Map<string, CareZoneOption>();
  data.ownedFarms
    ?.find((farm) => farm.id === farmId)
    ?.zones?.filter((zone) => zone.status !== "ARCHIVED")
    .forEach((zone) => {
      options.set(zone.id, {
        canonicalBackendField: "farm.zones.id",
        farmId,
        label: zone.name?.trim() || zone.code?.trim() || `Khu ${shortFoundationId(zone.id)}`,
        source: "FARM_ZONE",
        zoneId: zone.id,
      });
    });
  data.authorizedFarms.find((farm) => farm.farmId === farmId)?.allowedCultivationAreaIds?.forEach((zoneId) => {
    if (options.has(zoneId)) return;
    options.set(zoneId, {
      canonicalBackendField: "allowedCultivationAreaIds",
      farmId,
      label: `Area ${shortFoundationId(zoneId)}`,
      source: "AUTHORIZED_SCOPE",
      zoneId,
    });
  });
  data.plans.filter((plan) => plan.farmId === farmId).forEach((plan) => {
    if (options.has(plan.plotId)) return;
    options.set(plan.plotId, {
      canonicalBackendField: "plotId",
      farmId,
      label: `Plot ${shortFoundationId(plan.plotId)}`,
      source: "CULTIVATION_PLAN",
      zoneId: plan.plotId,
    });
  });
  data.activities.filter((activity) => activity.farmId === farmId).forEach((activity) => {
    if (options.has(activity.plotId)) return;
    options.set(activity.plotId, {
      canonicalBackendField: "plotId",
      farmId,
      label: `Plot ${shortFoundationId(activity.plotId)}`,
      source: "CULTIVATION_ACTIVITY",
      zoneId: activity.plotId,
    });
  });
  return Array.from(options.values());
}

export function buildFoundationSeasonOptions(data: CareFoundationData, farmId: string, zoneId: string): CareSeasonOption[] {
  if (!farmId || !zoneId) return [];
  const options = new Map<string, CareSeasonOption>();
  data.seasons
    ?.filter((season) => season.farmId === farmId && season.plotId === zoneId)
    .forEach((season) => {
      options.set(season.id, {
        farmId,
        label: season.name?.trim() || `Season ${shortFoundationId(season.id)}`,
        plotId: zoneId,
        seasonId: season.id,
        source: "CULTIVATION_SEASON",
      });
    });
  data.plans
    .filter((plan) => plan.farmId === farmId && plan.plotId === zoneId)
    .forEach((plan) => {
      options.set(plan.cultivationSeasonId, {
        farmId,
        label: seasonLabelFromPlan(plan),
        plotId: zoneId,
        seasonId: plan.cultivationSeasonId,
        source: "CULTIVATION_PLAN",
      });
    });
  data.activities
    .filter((activity) => activity.farmId === farmId && activity.plotId === zoneId)
    .forEach((activity) => {
      if (options.has(activity.cultivationSeasonId)) return;
      options.set(activity.cultivationSeasonId, {
        farmId,
        label: `Season ${shortFoundationId(activity.cultivationSeasonId)}`,
        plotId: zoneId,
        seasonId: activity.cultivationSeasonId,
        source: "CULTIVATION_ACTIVITY",
      });
    });
  return Array.from(options.values());
}

export function reconcileFoundationSelection(data: CareFoundationData, current: CareFoundationSelection): CareFoundationSelection {
  const farms = buildFoundationFarmOptions(data);
  const farmId = farms.some((farm) => farm.farmId === current.farmId) ? current.farmId : farms[0]?.farmId ?? "";
  const zones = buildFoundationZoneOptions(data, farmId);
  const zoneId = zones.some((zone) => zone.zoneId === current.zoneId) ? current.zoneId : zones[0]?.zoneId ?? "";
  const seasons = buildFoundationSeasonOptions(data, farmId, zoneId);
  const seasonId = seasons.some((season) => season.seasonId === current.seasonId) ? current.seasonId : seasons[0]?.seasonId ?? "";
  return { farmId, seasonId, zoneId };
}
