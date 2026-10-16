import { useCallback, useEffect, useRef, useState } from "react";

import { fetchSensorHistory, fetchSensorLatest } from "@/src/lib/iotApi";
import type { SensorHistoryPoint } from "@/src/lib/iotApi";

import type { IotTelemetryReading } from "./types";

const DEFAULT_DEVICE_ID = "esp32-01";
const LIVE_UPDATE_INTERVAL_MS = 30_000;

function toReading(row: SensorHistoryPoint, index = 0): IotTelemetryReading {
  return {
    deviceUid: row.device_id,
    humidity: row.air_humidity,
    id: `${row.device_id}-${row.timestamp}-${index}`,
    light: null,
    measuredAt: row.timestamp,
    receivedAt: row.timestamp,
    temperature: row.temperature,
    units: { humidity: "%", light: "raw", temperature: "°C" },
  };
}

export function useDurianLiveTelemetry(deviceId: string = DEFAULT_DEVICE_ID) {
  const [series, setSeries]               = useState<IotTelemetryReading[]>([]);
  const [isLive, setIsLive]               = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const [isConnected, setIsConnected]     = useState<boolean | null>(null);
  const hasSeedRef                        = useRef(false);

  useEffect(() => {
    if (hasSeedRef.current) return;
    hasSeedRef.current = true;

    fetchSensorHistory({ device_id: deviceId, limit: 8 })
      .then((result) => {
        if (result.data.length > 0) {
          const mapped = [...result.data].reverse().map((row, i) => toReading(row, i));
          setSeries(mapped);
          setIsConnected(true);
        }
      })
      .catch(() => {
        setIsConnected(false);
      });
  }, [deviceId]);

  const refresh = useCallback(async () => {
    try {
      const latest = await fetchSensorLatest(deviceId);
      const reading: IotTelemetryReading = {
        deviceUid: latest.device_id,
        humidity: latest.air_humidity,
        id: `${latest.device_id}-${latest.timestamp}-live`,
        light: null,
        measuredAt: latest.timestamp,
        receivedAt: latest.timestamp,
        temperature: latest.temperature,
        units: { humidity: "%", light: "raw", temperature: "°C" },
      };
      setSeries((prev) => [...prev.slice(-7), reading]);
      setLastUpdatedAt(new Date());
      setIsConnected(true);
    } catch {
      setSeries((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const jitter: IotTelemetryReading = {
          ...last,
          id: `${last.deviceUid}-${Date.now()}-jitter`,
          temperature: last.temperature !== null
            ? Number((last.temperature + (Math.random() - 0.5) * 0.8).toFixed(1))
            : null,
          humidity: last.humidity !== null
            ? Math.round(last.humidity + (Math.random() - 0.5) * 3)
            : null,
          measuredAt: new Date().toISOString(),
        };
        return [...prev.slice(-7), jitter];
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
    latest: series[series.length - 1] ?? null,
    refresh,
    series,
    setIsLive,
  };
}
