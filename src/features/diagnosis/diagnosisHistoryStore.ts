import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PredictionBoundingBox } from "@/src/features/scanner/diseasePredictionApi";
import type { DurianDisease } from "@/src/features/scanner/diseaseCatalog";

import type { DiagnosisHistoryEntry } from "./types";

const STORAGE_KEY = "duriancare.diagnosis.history.v1";

type NewDiagnosisEntry = {
  boundingBox: PredictionBoundingBox;
  confidence: number;
  disease: DurianDisease;
  imageUri: string;
};

async function readHistory(): Promise<DiagnosisHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as DiagnosisHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeHistory(entries: DiagnosisHistoryEntry[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function loadDiagnosisHistory() {
  const entries = await readHistory();
  return entries.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getDiagnosisHistoryEntry(entryId: string) {
  const entries = await readHistory();
  return entries.find((entry) => entry.id === entryId) ?? null;
}

export async function saveDiagnosisHistoryEntry(input: NewDiagnosisEntry) {
  const entry: DiagnosisHistoryEntry = {
    boundingBox: input.boundingBox,
    confidence: input.confidence,
    createdAt: new Date().toISOString(),
    diseaseCode: input.disease.code,
    diseaseName: input.disease.name,
    id: `diagnosis-${Date.now()}`,
    imageUri: input.imageUri,
  };

  const entries = await readHistory();
  const nextEntries = [entry, ...entries.filter((current) => current.imageUri !== input.imageUri)];
  await writeHistory(nextEntries);
  return entry;
}

export async function removeDiagnosisHistoryEntry(entryId: string) {
  const entries = await readHistory();
  const nextEntries = entries.filter((entry) => entry.id !== entryId);
  await writeHistory(nextEntries);
}
