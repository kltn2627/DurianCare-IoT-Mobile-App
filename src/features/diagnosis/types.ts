import type {
  DecisionSupport,
  DiseaseRecommendation,
  PredictionBoundingBox,
  PredictionSource,
  StoredImageInfo,
} from "@/src/features/scanner/diseasePredictionApi";
import type { DurianDisease } from "@/src/features/scanner/diseaseCatalog";

export type DiagnosisDetailSection = {
  heading: string;
  items: string[];
};

export type DiagnosisDetail = DurianDisease & {
  biologicalTreatments: string[];
  causes: string[];
  decisionSupport: string[];
  exportRequirements: string[];
  harvestInterval: string;
  references: string[];
  sections: DiagnosisDetailSection[];
  summary: string;
  symptoms: string[];
  organicTreatments: string[];
  chemicalTreatments: string[];
  prevention: string[];
};

export type DiagnosisHistoryEntry = {
  boundingBox: PredictionBoundingBox;
  confidence: number;
  confidenceText?: string;
  createdAt: string;
  decisionSupport?: DecisionSupport | null;
  diseaseCode: DurianDisease["code"] | string;
  diseaseName: string;
  id: string;
  image?: StoredImageInfo | null;
  imageUri: string;
  originalFilename?: string | null;
  predictedDisease?: string;
  recommendation?: DiseaseRecommendation | null;
  severity?: string | null;
  status?: string;
  source?: PredictionSource;
  deviceId?: string | null;
  topPredictions?: Array<{ confidence: number; label: string }>;
  usedDetectionCrop?: boolean;
};
