import { useCallback, useState } from 'react';
import { INITIAL_VEHICLES } from '../data/mockData';
import type { VehicleMarker } from '../types/telemetry';

/**
 * Vehicle positions for map overlays.
 * Map remains STATIC for now — no live GPS / WebSocket motion.
 * focusOn() only adjusts camera framing for UI readiness.
 */
export function useVehiclePositions() {
  const [vehicles] = useState<VehicleMarker[]>(() => INITIAL_VEHICLES.map((v) => ({ ...v })));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ x: number; y: number } | null>(null);

  const focusOn = useCallback((x: number, y: number, id?: string) => {
    setFocus({ x, y });
    if (id) setSelectedId(id);
    window.setTimeout(() => setFocus(null), 1200);
  }, []);

  return { vehicles, selectedId, setSelectedId, focus, focusOn };
}
