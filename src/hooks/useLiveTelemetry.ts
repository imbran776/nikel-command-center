import { useEffect, useState } from 'react';
import { INITIAL_KPIS } from '../data/mockData';
import type { TelemetryKpi } from '../types/telemetry';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/**
 * Live telemetry stream (mock).
 * Later: Socket.IO room `telemetry:kpis` on Railway realtime service.
 */
export function useLiveTelemetry() {
  const [kpis, setKpis] = useState<TelemetryKpi[]>(() =>
    INITIAL_KPIS.map((k) => ({ ...k })),
  );

  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setKpis((prev) =>
        prev.map((kpi) => {
          switch (kpi.id) {
            case 'fuel': {
              const v = Math.round(clamp(kpi.value + (Math.random() * 2 - 1) * 1.1, 78, 92));
              const liters = Math.round(17200 + v * 12 + (Math.random() * 2 - 1) * 60);
              return {
                ...kpi,
                value: v,
                gaugePercent: v,
                subtitle: `${liters.toLocaleString()}L/h`,
              };
            }
            case 'efficiency':
            case 'fuel_secondary': {
              const v = round1(clamp(kpi.value + (Math.random() * 2 - 1) * 0.45, 88.0, 96.5));
              return { ...kpi, value: v, gaugePercent: v };
            }
            case 'downtime': {
              const v = round1(clamp(kpi.value + (Math.random() * 2 - 1) * 0.12, 3.2, 5.8));
              return {
                ...kpi,
                value: v,
                gaugePercent: clamp((v / 24) * 100, 8, 28),
              };
            }
            default:
              return kpi;
          }
        }),
      );
    };
    // Slightly slower interval = fewer dashboard re-renders
    const id = window.setInterval(tick, 4000);
    return () => window.clearInterval(id);
  }, []);

  return { kpis };
}
