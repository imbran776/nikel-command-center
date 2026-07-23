import { useEffect, useState } from 'react';
import {
  INITIAL_PRODUCTION,
  PRODUCTION_TARGET,
  PRODUCTION_TOTAL,
  X_AXIS_LABELS,
} from '../data/mockData';
import type { ProductionBar } from '../types/telemetry';

/** Mock production series — swap for REST analytics later */
export function useProductionData() {
  const [bars, setBars] = useState<ProductionBar[]>(() =>
    INITIAL_PRODUCTION.map((b) => ({ ...b })),
  );
  const [total, setTotal] = useState(PRODUCTION_TOTAL);
  const target = PRODUCTION_TARGET;

  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setBars((prev) =>
        prev.map((bar, i) => {
          if (i < prev.length - 2) return bar;
          return {
            ...bar,
            primary: Math.max(
              12000,
              Math.min(32000, bar.primary + Math.round((Math.random() * 2 - 1) * 400)),
            ),
            secondary: Math.max(
              6000,
              Math.min(18000, bar.secondary + Math.round((Math.random() * 2 - 1) * 250)),
            ),
          };
        }),
      );
      setTotal((t) =>
        Math.max(40000, Math.min(45000, t + Math.round((Math.random() * 2 - 1) * 80))),
      );
    };
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, []);

  return { bars, total, target, xLabels: X_AXIS_LABELS };
}
