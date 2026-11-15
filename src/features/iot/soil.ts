/**
 * Soil probe verdict sent by the sensor firmware (>= 1.4.0); same wording as the Web dashboard.
 * Only "OK" carries a real percentage.
 */
const NOTES: Record<string, string> = {
  UNCALIBRATED: "Chưa hiệu chuẩn",
  NO_SIGNAL: "Không có tín hiệu — kiểm tra dây cảm biến",
  SATURATED: "Đầu dò hở hoặc chưa cắm vào đất",
  UNSTABLE: "Tín hiệu không ổn định — kiểm tra dây cảm biến",
};

/** Text shown instead of a percentage, or null when the reading is valid / from older firmware. */
export function soilSensorNote(status: string | null | undefined): string | null {
  if (!status || status === "OK") return null;
  return NOTES[status] ?? "Không có dữ liệu hợp lệ";
}

/** Value for the "Độ ẩm đất" cell: a real percentage, the probe's diagnosis, or a dash. */
export function soilMoistureText(
  soilMoisture: { value: number } | null | undefined,
  soilSensor: { status: string } | null | undefined,
): string {
  if (soilMoisture) return `${soilMoisture.value}%`;
  return soilSensorNote(soilSensor?.status) ?? "—";
}
