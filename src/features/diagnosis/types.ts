import type { PredictionBoundingBox } from "@/src/features/scanner/diseasePredictionApi";
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
  createdAt: string;
  diseaseCode: DurianDisease["code"];
  diseaseName: string;
  id: string;
  imageUri: string;
};
