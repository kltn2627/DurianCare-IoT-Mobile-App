import {
  deletePredictionHistory,
  getPredictionHistoryItem,
  listPredictionHistory,
  type PredictionHistoryItem,
} from "@/src/features/scanner/diseasePredictionApi";

import type { DiagnosisHistoryEntry } from "./types";

function toDiagnosisEntry(item: PredictionHistoryItem): DiagnosisHistoryEntry {
  return {
    boundingBox: item.data.boundingBox ?? { height: 34, left: 24, top: 22, width: 52 },
    confidence: item.confidence,
    confidenceText: item.confidenceText,
    createdAt: item.diagnosedAt,
    decisionSupport: item.data.decisionSupport,
    diseaseCode: item.predictedDisease,
    diseaseName: item.data.disease.name,
    id: item.id,
    image: item.image,
    imageUri: item.image?.url ?? "",
    originalFilename: item.originalFilename,
    predictedDisease: item.predictedDisease,
    recommendation: item.data.recommendation,
    severity: item.severity,
    status: item.status,
    source: item.source,
    deviceId: item.deviceId,
    topPredictions: item.data.topPredictions,
    usedDetectionCrop: item.usedDetectionCrop,
  };
}

export async function loadDiagnosisHistory(page = 1, pageSize = 20) {
  const response = await listPredictionHistory({ page, pageSize });
  return response.items.map(toDiagnosisEntry);
}

export async function getDiagnosisHistoryEntry(entryId: string) {
  const entry = await getPredictionHistoryItem(entryId);
  return entry ? toDiagnosisEntry(entry) : null;
}

export async function saveDiagnosisHistoryEntry() {
  throw new Error("Prediction history is persisted by the backend AI service.");
}

export async function removeDiagnosisHistoryEntry(entryId: string) {
  await deletePredictionHistory(entryId);
}
