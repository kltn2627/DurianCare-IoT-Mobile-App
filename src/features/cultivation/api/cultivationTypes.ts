export type ActivityType =
  | "IRRIGATION"
  | "FERTILIZATION"
  | "FERTIGATION"
  | "BIOLOGICAL_TREATMENT"
  | "CHEMICAL_TREATMENT"
  | "PEST_MONITORING"
  | "DISEASE_MONITORING"
  | "PRUNING"
  | "ORCHARD_SANITATION"
  | "WEED_CONTROL"
  | "SOIL_IMPROVEMENT"
  | "POLLINATION"
  | "FRUIT_BAGGING"
  | "SOIL_SAMPLING"
  | "WATER_SAMPLING"
  | "LEAF_SAMPLING"
  | "FRUIT_SAMPLING"
  | "HARVEST"
  | "OTHER";

export type ActivityStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "SKIPPED"
  | "CANCELLED"
  | "OVERDUE";

export type PlanStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type BiologicalLevel =
  | "FULLY_BIOLOGICAL"
  | "BIOLOGICAL"
  | "LOW_RISK"
  | "CHEMICAL"
  | "RESTRICTED_CHEMICAL"
  | "PROHIBITED"
  | "UNKNOWN";

export type InputCategory =
  | "ORGANIC_FERTILIZER"
  | "MICROBIAL_FERTILIZER"
  | "CHEMICAL_FERTILIZER"
  | "SOIL_CONDITIONER"
  | "BIOLOGICAL_CONTROL"
  | "BOTANICAL_PRODUCT"
  | "BENEFICIAL_ORGANISM"
  | "PHEROMONE"
  | "TRAP"
  | "MINERAL_OIL"
  | "CHEMICAL_PESTICIDE"
  | "OTHER";

export type InputStatus = "DRAFT" | "VERIFIED" | "INACTIVE" | "PROHIBITED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";

export type HarvestBatchStatus =
  | "DRAFT"
  | "BLOCKED"
  | "APPROVED"
  | "HARVESTED"
  | "CANCELLED";

export type ExportReleaseStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "WAITING_FOR_LAB_RESULT"
  | "BLOCKED"
  | "APPROVED"
  | "RELEASED"
  | "RECALLED";

export type AuthorizedFarm = {
  allowedCultivationAreaIds: string[];
  authorizationId: string;
  expiresAt?: string | null;
  farmId: string;
  farmName?: string | null;
  grantedAt?: string | null;
  ownerId: string;
  permissions: string[];
  status: string;
};

export type FarmZoneStatus = "ACTIVE" | "INACTIVE" | "QUARANTINED" | "ARCHIVED";
export type FarmStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export type FarmZoneCatalog = {
  areaSquareMeters?: number | null;
  boundaryGeoJson?: Record<string, unknown> | null;
  code?: string | null;
  createdAt?: string | null;
  description?: string | null;
  id: string;
  name: string;
  status: FarmZoneStatus;
  updatedAt?: string | null;
};

export type FarmCatalog = {
  address?: string | null;
  areaHectares?: number | null;
  createdAt?: string | null;
  district?: string | null;
  id: string;
  latitude?: number | null;
  longitude?: number | null;
  name: string;
  ownerUserId: string;
  province?: string | null;
  status: FarmStatus;
  updatedAt?: string | null;
  zones: FarmZoneCatalog[];
};

export type CultivationSeason = {
  createdAt?: string | null;
  createdBy: string;
  crop?: string | null;
  endDate?: string | null;
  farmId: string;
  id: string;
  name: string;
  plotId: string;
  startDate: string;
  updatedAt?: string | null;
  variety?: string | null;
};

export type CreateFarmRequest = {
  address?: string | null;
  areaHectares?: number | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  name: string;
  province?: string | null;
};

export type UpdateFarmRequest = Partial<CreateFarmRequest> & {
  status?: FarmStatus;
};

export type CreateFarmZoneRequest = {
  areaSquareMeters?: number | null;
  boundaryGeoJson?: Record<string, unknown> | null;
  code?: string | null;
  description?: string | null;
  name: string;
};

export type UpdateFarmZoneRequest = Partial<CreateFarmZoneRequest> & {
  status?: FarmZoneStatus;
};

export type CreateCultivationSeasonRequest = {
  createdBy: string;
  crop?: string | null;
  endDate?: string | null;
  farmId: string;
  name: string;
  plotId: string;
  startDate: string;
  variety?: string | null;
};

export type UpdateCultivationSeasonRequest = {
  crop?: string | null;
  endDate?: string | null;
  name?: string | null;
  startDate?: string | null;
  variety?: string | null;
};

export type CareFarmOption = {
  farmId: string;
  label: string;
  ownerId?: string | null;
  permissions: string[];
  source: "AUTHORIZED" | "CULTIVATION_DATA" | "OWNED";
  zoneIds: string[];
};

export type CareZoneOption = {
  farmId: string;
  canonicalBackendField?: "allowedCultivationAreaIds" | "farm.zones.id" | "plotId";
  label: string;
  source?: "AUTHORIZED_SCOPE" | "CULTIVATION_ACTIVITY" | "CULTIVATION_PLAN" | "FARM_ZONE";
  zoneId: string;
};

export type CareSeasonOption = {
  farmId: string;
  label: string;
  plotId: string;
  seasonId: string;
  source?: "CULTIVATION_ACTIVITY" | "CULTIVATION_PLAN" | "CULTIVATION_SEASON";
};

export type ActiveIngredientSnapshot = {
  code: string;
  concentration?: number | null;
  concentrationUnit?: string | null;
  name: string;
};

export type AgriculturalInput = {
  activeIngredients: ActiveIngredientSnapshot[];
  allowedMarketCodes: string[];
  applicableCrops: string[];
  beneficialOrganisms: string[];
  biologicalLevel: BiologicalLevel;
  category: InputCategory;
  certificateDocumentUrls: string[];
  code: string;
  createdAt: string;
  id: string;
  labelDocumentUrl?: string | null;
  manufacturer?: string | null;
  maximumDose?: string | null;
  preHarvestIntervalDays?: number | null;
  productName: string;
  prohibitedMarketCodes: string[];
  recommendedDose?: string | null;
  reEntryIntervalHours?: number | null;
  registrationNumber?: string | null;
  status: InputStatus;
  targetPests: string[];
  tradeName?: string | null;
  unit?: string | null;
  updatedAt: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
};

export type CultivationActivity = {
  id: string;
  cultivationPlanId: string;
  cultivationSeasonId: string;
  farmId: string;
  plotId: string;
  treeIds: string[];
  activityType: ActivityType;
  title: string;
  description?: string | null;
  scheduledStartAt: string;
  scheduledEndAt?: string | null;
  recurrenceRule?: string | null;
  priority?: string | null;
  status: ActivityStatus;
  assignedUserIds: string[];
  agriculturalInputIds?: string[];
  inputIds?: string[];
  plannedInputIds?: string[];
  plannedInputs?: AgriculturalInput[];
  approvalRequired: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  version?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CultivationPlan = {
  id: string;
  farmId: string;
  plotId: string;
  cultivationSeasonId: string;
  templateId?: string | null;
  name: string;
  startDate: string;
  expectedHarvestDate?: string | null;
  targetMarketCodes: string[];
  status: PlanStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateCultivationPlanRequest = {
  createdBy: string;
  cultivationSeasonId: string;
  expectedHarvestDate?: string | null;
  farmId: string;
  name: string;
  plotId: string;
  startDate: string;
  targetMarketCodes: string[];
  templateId?: string | null;
};

export type CreateCultivationActivityRequest = {
  activityType: ActivityType;
  agriculturalInputIds?: string[];
  approvalRequired: boolean;
  approvalUserId?: string;
  assignedUserIds: string[];
  biologicalControlReason?: string;
  cultivationPlanId: string;
  cultivationSeasonId: string;
  description?: string | null;
  farmId: string;
  plotId: string;
  priority?: string;
  recurrenceRule?: string | null;
  scheduledEndAt?: string | null;
  scheduledStartAt: string;
  targetPestOrDisease?: string;
  title: string;
  treeIds?: string[];
};

export type UpdateCultivationActivityRequest = {
  assignedUserIds?: string[];
  description?: string | null;
  priority?: string;
  scheduledEndAt?: string | null;
  scheduledStartAt?: string;
  title?: string;
};

export type ApproveCultivationActivityRequest = {
  userId: string;
};

export type RejectCultivationActivityRequest = {
  reason: string;
  userId: string;
};

export type CompleteCultivationActivityRequest = {
  actualArea?: number;
  actualTreeCount?: number;
  applicationMethod?: string | null;
  areaUnit?: string | null;
  completedAt: string;
  equipment?: string | null;
  evidenceFiles: string[];
  executedBy: string;
  inputUsages: unknown[];
  notes?: string | null;
  resultObservation?: string | null;
  startedAt: string;
  supervisedBy?: string | null;
  weatherSnapshot: Record<string, unknown>;
};

export type CompleteCultivationActivityResponse = {
  activity: CultivationActivity;
  earliestSafeHarvestDate?: string | null;
  execution: unknown;
  inputUsages: unknown[];
};

export type AgriculturalInputSnapshot = {
  activeIngredients: ActiveIngredientSnapshot[];
  allowedMarketCodes: string[];
  biologicalLevel: BiologicalLevel;
  category: InputCategory;
  code: string;
  manufacturer?: string | null;
  preHarvestIntervalDays?: number | null;
  productName: string;
  prohibitedMarketCodes: string[];
  tradeName?: string | null;
};

export type ActivityExecution = {
  actualArea?: number | null;
  actualTreeCount?: number | null;
  activityExecutionId?: string;
  applicationMethod?: string | null;
  areaUnit?: string | null;
  completedAt: string;
  createdAt: string;
  cultivationActivityId: string;
  equipment?: string | null;
  evidenceFiles: string[];
  executedBy: string;
  id: string;
  locked: boolean;
  notes?: string | null;
  resultObservation?: string | null;
  startedAt: string;
  supervisedBy?: string | null;
  weatherSnapshot?: Record<string, unknown> | null;
};

export type ActivityInputUsage = {
  activeIngredientSnapshots: ActiveIngredientSnapshot[];
  activityExecutionId: string;
  agriculturalInputId: string;
  agriculturalInputSnapshot?: AgriculturalInputSnapshot | null;
  areaUnit?: string | null;
  batchNumber?: string | null;
  calculatedSafeHarvestDate?: string | null;
  concentration?: number | null;
  concentrationUnit?: string | null;
  createdAt: string;
  expiryDate?: string | null;
  id: string;
  quantityUnit: string;
  quantityUsed: number;
  treatedArea?: number | null;
  waterVolume?: number | null;
  waterVolumeUnit?: string | null;
};

export type CareHistoryResponse = {
  activities: CultivationActivity[];
  executions: ActivityExecution[];
  inputUsages: ActivityInputUsage[];
};

export type ComplianceAssessment = {
  id: string;
  cultivationSeasonId: string;
  harvestBatchId?: string | null;
  targetMarketCode: string;
  riskScore: number;
  riskLevel: RiskLevel;
  blockingReasons: string[];
  warnings: string[];
  earliestSafeHarvestDate?: string | null;
  requiresLabTest: boolean;
  eligibleForHarvest: boolean;
  eligibleForExportRelease: boolean;
  assessmentDetails: Record<string, unknown>;
  assessedAt: string;
  rulesVersion: string;
};

export type SafeHarvestDateResponse = {
  cultivationSeasonId: string;
  earliestSafeHarvestDate?: string | null;
};

export type SourceType =
  | "CODEX"
  | "VIETNAM"
  | "EU"
  | "CHINA"
  | "JAPAN"
  | "SOUTH_KOREA"
  | "CUSTOMER_SPECIFICATION"
  | "OTHER";

export type LabResultStatus =
  | "PASS"
  | "FAIL"
  | "NOT_DETECTED"
  | "BELOW_LIMIT_OF_QUANTIFICATION"
  | "NO_STANDARD_FOUND"
  | "PENDING_REVIEW";

export type LabSampleStatus = "COLLECTED" | "SENT" | "RESULT_RECORDED" | "CANCELLED";

export type ResidueStandard = {
  active: boolean;
  activeIngredientCode: string;
  activeIngredientName: string;
  commodityCode: string;
  commodityName: string;
  createdAt: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  id: string;
  marketCode: string;
  mrlValue: number;
  sourceReference?: string | null;
  sourceType: SourceType;
  unit: string;
  updatedAt: string;
  verified: boolean;
  version?: number | null;
};

export type LabSample = {
  attachments: string[];
  createdAt: string;
  cultivationSeasonId: string;
  harvestBatchId?: string | null;
  id: string;
  laboratoryAccreditation?: string | null;
  laboratoryName: string;
  sampleCode: string;
  sampleType: string;
  sampledAt: string;
  sampledBy: string;
  samplingLocation?: string | null;
  status: LabSampleStatus;
};

export type LabResidueResult = {
  activeIngredientCode: string;
  activeIngredientName: string;
  applicableMrl?: number | null;
  applicableMrlSource?: string | null;
  createdAt: string;
  detectionLimit?: number | null;
  id: string;
  labSampleId: string;
  measuredValue?: number | null;
  quantificationLimit?: number | null;
  resultStatus: LabResultStatus;
  unit: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
};

export type HarvestBatch = {
  batchCode: string;
  chemicalRiskLevel: RiskLevel;
  createdAt: string;
  createdBy: string;
  cultivationSeasonId: string;
  expectedDestinationMarket: string;
  farmId: string;
  harvestedAt: string;
  id: string;
  latestSafeHarvestDate?: string | null;
  plotId: string;
  quantity: number;
  quantityUnit: string;
  status: HarvestBatchStatus;
};

export type CreateHarvestBatchRequest = {
  batchCode: string;
  createdBy: string;
  cultivationSeasonId: string;
  expectedDestinationMarket: string;
  farmId: string;
  harvestedAt: string;
  overrideReason?: string | null;
  overrideSafeHarvestDate: boolean;
  plotId: string;
  quantity: number;
  quantityUnit: string;
};

export type ExportRelease = {
  complianceAssessmentSnapshot?: Record<string, unknown> | null;
  createdAt: string;
  harvestBatchId: string;
  id: string;
  rejectionReason?: string | null;
  releaseCode: string;
  releasedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  status: ExportReleaseStatus;
  submittedAt?: string | null;
  submittedBy: string;
  targetMarketCode: string;
  traceabilitySnapshot?: TraceabilitySnapshot | null;
};

export type CreateExportReleaseRequest = {
  harvestBatchId: string;
  releaseCode: string;
  submittedBy: string;
  targetMarketCode: string;
};

export type TraceabilitySnapshot = {
  careHistory?: {
    activities?: CultivationActivity[];
    executions?: unknown[];
    inputUsages?: unknown[];
  };
  complianceAssessment?: Record<string, unknown>;
  generatedAt?: string;
  harvestBatch?: HarvestBatch;
  [key: string]: unknown;
};

export type TraceabilityResponse = {
  releaseId: string;
  snapshot: TraceabilitySnapshot;
};
