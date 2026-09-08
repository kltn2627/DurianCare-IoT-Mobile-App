import { useCallback, useEffect, useRef, useState } from "react";

import { durianClimateSeries } from "@/src/constants/durianMockData";
import { fetchSensorHistory, fetchSensorLatest } from "@/src/lib/iotApi";

import type { DurianTelemetryReading } from "./types";

const DEFAULT_DEVICE_ID = "esp32-01";
const LIVE_UPDATE_INTERVAL_MS = 30_000;

// Fallback seed used only when the real API is unreachable
const FALLBACK_SERIES = durianClimateSeries as DurianTelemetryReading[];

function toReading(row: {
  temperature?: number | null;
  air_humidity?: number | null;
  soil_moisture?: number | null;
  timestamp?: string;
}): DurianTelemetryReading {
  return {
    airTemperature: Number((row.temperature ?? 29).toFixed(1)),
    airHumidity:    Math.round(row.air_humidity ?? 75),
    soilMoisture:   Math.round(row.soil_moisture ?? 72),
    nitrogen:       0,   // IoT service doesn't track NPK yet — keep 0
    phosphorus:     0,
    potassium:      0,
    time: row.timestamp
      ? new Date(row.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      : new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
  };
}

export function useDurianLiveTelemetry(deviceId: string = DEFAULT_DEVICE_ID) {
  const [series, setSeries]               = useState<DurianTelemetryReading[]>(FALLBACK_SERIES);
  const [isLive, setIsLive]               = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const [isConnected, setIsConnected]     = useState<boolean | null>(null);
  const hasSeedRef                        = useRef(false);

  // Seed historical chart data on mount
  useEffect(() => {
    if (hasSeedRef.current) return;
    hasSeedRef.current = true;

    fetchSensorHistory({ device_id: deviceId, limit: 8 })
      .then((result) => {
        if (result.data.length > 0) {
          const mapped = [...result.data].reverse().map(toReading);
          setSeries(mapped);
          setIsConnected(true);
        }
      })
      .catch(() => {
        // API unreachable — keep fallback mock data
        setIsConnected(false);
      });
  }, [deviceId]);

  const refresh = useCallback(async () => {
    try {
      const latest = await fetchSensorLatest(deviceId);
      setSeries((prev) => {
        const next = toReading(latest as Parameters<typeof toReading>[0]);
        return [...prev.slice(-7), next];
      });
      setLastUpdatedAt(new Date());
      setIsConnected(true);
    } catch {
      // silently fall back to mock jitter when offline
      setSeries((prev) => {
        const last = prev[prev.length - 1];
        const next: DurianTelemetryReading = {
          airTemperature: Number((last.airTemperature + (Math.random() - 0.5) * 0.8).toFixed(1)),
          airHumidity:    Math.round(last.airHumidity + (Math.random() - 0.5) * 3),
          soilMoisture:   Math.round(last.soilMoisture + (Math.random() - 0.5) * 3),
          nitrogen:       last.nitrogen,
          phosphorus:     last.phosphorus,
          potassium:      last.potassium,
          time:           new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        };
        return [...prev.slice(-7), next];
      });
      setLastUpdatedAt(new Date());
      setIsConnected(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (!isLive) return undefined;
    const id = setInterval(() => { void refresh(); }, LIVE_UPDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isLive, refresh]);

  return {
    isLive,
    isConnected,
    lastUpdatedAt,
    latest: series[series.length - 1],
    refresh,
    series,
    setIsLive,
  };
}
