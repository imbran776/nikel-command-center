import { useCallback, useEffect, useRef, useState } from 'react';
import { INITIAL_VEHICLES } from '../data/mockData';
import { latLngToMapXY } from '../lib/mapConfig';
import type { VehicleMarker } from '../types/fms';

/**
 * Vehicle positions & Mobile GPS live tracking hook.
 * Stores breadcrumb motion trails for all moving vehicles & syncs external mobile GPS broadcasts.
 */
export function useVehiclePositions() {
  const [vehicles, setVehicles] = useState<VehicleMarker[]>(() =>
    INITIAL_VEHICLES.map((v) => ({ ...v })),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ x: number; y: number; lat?: number; lng?: number } | null>(null);

  // Mobile GPS states
  const [mobileGpsActive, setMobileGpsActive] = useState(false);
  const [mobileGpsError, setMobileGpsError] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const focusOn = useCallback((x: number, y: number, id?: string, lat?: number, lng?: number) => {
    setFocus({ x, y, lat, lng });
    if (id) setSelectedId(id);
    window.setTimeout(() => setFocus(null), 1200);
  }, []);

  /**
   * Helper to push a new position onto a vehicle's motion trail history.
   */
  const updateVehicleWithTrail = (
    prevVehicles: VehicleMarker[],
    newV: VehicleMarker,
  ): VehicleMarker[] => {
    const idx = prevVehicles.findIndex((v) => v.id === newV.id || v.label === newV.label);
    const existing = idx >= 0 ? prevVehicles[idx] : null;

    const newPoint = {
      lat: newV.lat ?? 0,
      lng: newV.lng ?? 0,
    };

    let updatedTrail = existing?.trail ? [...existing.trail] : [];
    if (newV.lat !== undefined && newV.lng !== undefined) {
      // Append point if it moved > 1 meter
      const lastPoint = updatedTrail[updatedTrail.length - 1];
      if (!lastPoint || Math.abs(lastPoint.lat - newV.lat) > 0.00005 || Math.abs(lastPoint.lng - newV.lng) > 0.00005) {
        updatedTrail.push(newPoint);
        if (updatedTrail.length > 40) updatedTrail.shift();
      }
    }

    const mergedVehicle: VehicleMarker = {
      ...newV,
      trail: updatedTrail,
    };

    if (idx >= 0) {
      const copy = [...prevVehicles];
      copy[idx] = mergedVehicle;
      return copy;
    }
    return [mergedVehicle, ...prevVehicles];
  };

  const addVehicle = useCallback((newVehicle: Omit<VehicleMarker, 'x' | 'y'> & { x?: number; y?: number }) => {
    let x = newVehicle.x;
    let y = newVehicle.y;

    if (x === undefined || y === undefined) {
      if (newVehicle.lat !== undefined && newVehicle.lng !== undefined) {
        const xy = latLngToMapXY(newVehicle.lat, newVehicle.lng);
        x = xy.x;
        y = xy.y;
      } else {
        x = 50;
        y = 50;
      }
    }

    const fullVehicle: VehicleMarker = {
      ...newVehicle,
      x,
      y,
    };

    setVehicles((prev) => updateVehicleWithTrail(prev, fullVehicle));

    if (fullVehicle.lat !== undefined && fullVehicle.lng !== undefined) {
      focusOn(x, y, fullVehicle.id, fullVehicle.lat, fullVehicle.lng);
    } else {
      focusOn(x, y, fullVehicle.id);
    }
  }, [focusOn]);

  // Listen for BroadcastChannel messages & localStorage events from external mobile GPS devices
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('mining_gps_channel');
      channel.onmessage = (e) => {
        if (e.data && e.data.type === 'GPS_UPDATE') {
          const { unitLabel, lat, lng, speedKph, heading, operationalStatus, sos } = e.data;
          const xy = latLngToMapXY(lat, lng);

          const gpsVehicle: VehicleMarker = {
            id: `GPS-${unitLabel}`,
            type: 'haul',
            label: unitLabel || 'MOBILE-GPS',
            detail: `${sos ? '🚨 SOS · ' : ''}${operationalStatus || 'Hauling'} · ${speedKph || 0} kph`,
            x: xy.x,
            y: xy.y,
            lat,
            lng,
            heading: heading || 0,
          };

          setVehicles((prev) => updateVehicleWithTrail(prev, gpsVehicle));
        }
      };
    } catch {
      // Fallback if BroadcastChannel unsupported
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mining_gps_live_data' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          const { unitLabel, lat, lng, speedKph, heading, operationalStatus, sos } = data;
          const xy = latLngToMapXY(lat, lng);

          const gpsVehicle: VehicleMarker = {
            id: `GPS-${unitLabel}`,
            type: 'haul',
            label: unitLabel || 'MOBILE-GPS',
            detail: `${sos ? '🚨 SOS · ' : ''}${operationalStatus || 'Hauling'} · ${speedKph || 0} kph`,
            x: xy.x,
            y: xy.y,
            lat,
            lng,
            heading: heading || 0,
          };

          setVehicles((prev) => updateVehicleWithTrail(prev, gpsVehicle));
        } catch {
          // ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const toggleMobileGpsTrack = useCallback(() => {
    if (mobileGpsActive) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setMobileGpsActive(false);
      setMobileGpsError(null);
    } else {
      if (!navigator.geolocation) {
        setMobileGpsError('Geolocation tidak didukung oleh browser Anda.');
        return;
      }

      setMobileGpsActive(true);
      setMobileGpsError(null);

      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const heading = pos.coords.heading ?? 0;
          const speedKph = Math.round((pos.coords.speed ?? 0) * 3.6);

          const { x, y } = latLngToMapXY(lat, lng);
          setMyLocation({ lat, lng });

          const phoneVehicle: VehicleMarker = {
            id: 'MOBILE-GPS-01',
            type: 'haul',
            label: 'MOBILE-GPS-01',
            detail: `${speedKph} kph · HP GPS Live`,
            x,
            y,
            lat,
            lng,
            heading: heading || 0,
          };

          setVehicles((prev) => updateVehicleWithTrail(prev, phoneVehicle));

          setFocus({ x, y, lat, lng });
          setSelectedId('MOBILE-GPS-01');
        },
        (err) => {
          console.warn('Geolocation watch error:', err);
          let msg = 'Gagal mengakses GPS HP.';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Izin GPS ditolak. Silakan izinkan akses lokasi di browser.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Sinyal GPS HP tidak tersedia.';
          }
          setMobileGpsError(msg);
          setMobileGpsActive(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 10000,
        },
      );

      watchIdRef.current = id;
    }
  }, [mobileGpsActive]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    vehicles,
    selectedId,
    setSelectedId,
    focus,
    focusOn,
    addVehicle,
    mobileGpsActive,
    mobileGpsError,
    myLocation,
    toggleMobileGpsTrack,
  };
}
