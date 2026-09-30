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

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";

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
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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

export type ScheduleTaskType = "fertilizer" | "pesticide" | "irrigation" | "pruning" | "inspection";
export type ScheduleTaskStatus = "planned" | "in-progress" | "done";

export type CultivationSchedule = {
  id: string;
  zoneId: string;
  cropId: string;
  type: ScheduleTaskType;
  status: ScheduleTaskStatus;
  date: string;
  time: string;
  materialName: string;
  dosage: string;
  assignee: string;
  safetyInterval: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateCultivationScheduleRequest = {
  zoneId: string;
  cropId: string;
  type: ScheduleTaskType;
  scheduledAt: string;
  materialName: string;
  dosage: string;
  assignee: string;
  safetyInterval: string;
  notes: string;
};
