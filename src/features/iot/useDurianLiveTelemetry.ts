import { useCallback, useEffect, useState } from "react";

import { durianClimateSeries } from "@/src/constants/durianMockData";

import type { DurianTelemetryReading } from "./types";

const INITIAL_SERIES = durianClimateSeries as DurianTelemetryReading[];
const LIVE_UPDATE_INTERVAL_MS = 5_000;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function jitter(range: number): number {
  return (Math.random() - 0.5) * range;
}

function createLiveReading(previous: DurianTelemetryReading): DurianTelemetryReading {
  return {
    airHumidity: Math.round(clamp(previous.airHumidity + jitter(3), 62, 92)),
    airTemperature: Number(
      clamp(previous.airTemperature + jitter(0.8), 26, 35).toFixed(1),
    ),
    nitrogen: Math.round(clamp(previous.nitrogen + jitter(5), 80, 145)),
    phosphorus: Math.round(clamp(previous.phosphorus + jitter(3), 28, 58)),
    potassium: Math.round(clamp(previous.potassium + jitter(6), 120, 190)),
    soilMoisture: Math.round(clamp(previous.soilMoisture + jitter(3), 58, 90)),
    time: new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function useDurianLiveTelemetry() {
  const [series, setSeries] = useState<DurianTelemetryReading[]>(INITIAL_SERIES);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());

  const refresh = useCallback(() => {
    setSeries((current) => {
      const next = createLiveReading(current[current.length - 1]);
      return [...current.slice(-7), next];
    });
    setLastUpdatedAt(new Date());
  }, []);

  useEffect(
    function streamTelemetry() {
      if (!isLive) return undefined;
      const intervalId = setInterval(refresh, LIVE_UPDATE_INTERVAL_MS);
      return () => clearInterval(intervalId);
    },
    [isLive, refresh],
  );

  return {
    isLive,
    lastUpdatedAt,
    latest: series[series.length - 1],
    refresh,
    series,
    setIsLive,
  };
}
