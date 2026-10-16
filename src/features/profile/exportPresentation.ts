type SourceRecord = {dataOrigin?: string; batchCode?: string; releaseCode?: string; traceabilitySnapshot?: Record<string, unknown> | null};

export function isIllustration(record: SourceRecord) {
  return record.dataOrigin === "DEMO_SYNTHETIC" || (record.batchCode ?? record.releaseCode ?? "").startsWith("DEMO-SYNTHETIC-") || record.traceabilitySnapshot?.dataOrigin === "DEMO_SYNTHETIC";
}

export function illustrationTitle(record: SourceRecord) {
  if (!isIllustration(record)) return record.releaseCode ?? record.batchCode ?? "Hồ sơ";
  const variety = record.traceabilitySnapshot?.variety;
  return typeof variety === "string" && variety.trim() ? `Lô ${variety}` : "Lô thu hoạch";
}

export function quantityLabel(quantity: number | string, unit: string) {
  return `${new Intl.NumberFormat("vi-VN", {maximumFractionDigits:3}).format(Number(quantity))} ${unit.toLowerCase()}`;
}
