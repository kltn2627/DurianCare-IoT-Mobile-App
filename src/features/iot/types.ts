export type DurianTelemetryReading = {
  airHumidity: number;
  airTemperature: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  soilMoisture: number;
  time: string;
};

export type DurianSensorStation = {
  battery: number;
  device: string;
  id: string;
  lastSeen: string;
  name: string;
  status: "ONLINE" | "MAINTENANCE";
};
