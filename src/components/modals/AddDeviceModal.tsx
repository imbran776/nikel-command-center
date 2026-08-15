import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Navigation,
  Plus,
  QrCode,
  Share2,
  Smartphone,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { VehicleMarker } from '../../types/fms';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVehicle: (v: Omit<VehicleMarker, 'x' | 'y'> & { x?: number; y?: number }) => void;
  mobileGpsActive: boolean;
  mobileGpsError: string | null;
  onToggleMobileGps: () => void;
}

export default function AddDeviceModal({
  isOpen,
  onClose,
  onAddVehicle,
  mobileGpsActive,
  mobileGpsError,
  onToggleMobileGps,
}: AddDeviceModalProps) {
  const [tab, setTab] = useState<'qr' | 'direct' | 'manual'>('qr');
  const [copied, setCopied] = useState(false);
  const [unitLabel, setUnitLabel] = useState('HT-888');
  const [type, setType] = useState<'haul' | 'excavator'>('haul');
  const [operator, setOperator] = useState('Budi S.');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const trackerUrl = `${window.location.origin}${window.location.pathname}#track`;

  const copyTrackerLink = () => {
    navigator.clipboard.writeText(trackerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    onAddVehicle({
      id: `UNIT-${Date.now().toString().slice(-4)}`,
      label: unitLabel.toUpperCase(),
      type,
      detail: `Op: ${operator} · Live Add`,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#2A3036] bg-[#0D1116] text-[#E8ECEF] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A3036] px-4 py-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-[#1ADBDE]" />
            <h3 className="text-sm font-semibold tracking-wide text-[#E8ECEF]">
              HUBUNGKAN HP KE PETA (GPS TRACKER)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#7A848C] hover:bg-[#1A2026] hover:text-[#E8ECEF]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#2A3036] bg-[#12171C] p-1 text-xs">
          <button
            type="button"
            onClick={() => setTab('qr')}
            className={`flex-1 rounded-md px-2.5 py-1.5 font-semibold transition-colors ${
              tab === 'qr'
                ? 'bg-[#1ADBDE] text-[#0D1116]'
                : 'text-[#8A949C] hover:text-[#E8ECEF]'
            }`}
          >
            📲 Kirim Link / QR HP
          </button>
          <button
            type="button"
            onClick={() => setTab('direct')}
            className={`flex-1 rounded-md px-2.5 py-1.5 font-semibold transition-colors ${
              tab === 'direct'
                ? 'bg-[#1ADBDE] text-[#0D1116]'
                : 'text-[#8A949C] hover:text-[#E8ECEF]'
            }`}
          >
            ⚡ Aktifkan Di Perangkat Ini
          </button>
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`flex-1 rounded-md px-2.5 py-1.5 font-semibold transition-colors ${
              tab === 'manual'
                ? 'bg-[#1ADBDE] text-[#0D1116]'
                : 'text-[#8A949C] hover:text-[#E8ECEF]'
            }`}
          >
            ➕ Tambah Unit
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 text-xs">
          {tab === 'qr' && (
            <div className="space-y-4 text-center">
              <p className="text-[#A0AABC] leading-relaxed">
                Scan QR Code ini menggunakan kamera HP Anda atau klik tombol salin link untuk mentransmisikan lokasi pergerakan HP ke peta secara langsung!
              </p>

              {/* QR Code visual box */}
              <div className="mx-auto flex h-44 w-44 flex-col items-center justify-center rounded-xl border border-[#2A3036] bg-white p-3 shadow-inner">
                <svg viewBox="0 0 100 100" className="h-full w-full" fill="#0D1116">
                  {/* Outer corner boxes */}
                  <rect x="5" y="5" width="30" height="30" fill="none" stroke="#0D1116" strokeWidth="4" />
                  <rect x="12" y="12" width="16" height="16" />
                  <rect x="65" y="5" width="30" height="30" fill="none" stroke="#0D1116" strokeWidth="4" />
                  <rect x="72" y="12" width="16" height="16" />
                  <rect x="5" y="65" width="30" height="30" fill="none" stroke="#0D1116" strokeWidth="4" />
                  <rect x="12" y="72" width="16" height="16" />
                  {/* Pattern dots */}
                  <rect x="42" y="8" width="6" height="6" />
                  <rect x="52" y="18" width="6" height="6" />
                  <rect x="42" y="28" width="6" height="6" />
                  <rect x="10" y="42" width="6" height="6" />
                  <rect x="25" y="50" width="6" height="6" />
                  <rect x="42" y="42" width="16" height="16" fill="#1ADBDE" />
                  <rect x="65" y="42" width="6" height="6" />
                  <rect x="80" y="50" width="6" height="6" />
                  <rect x="42" y="65" width="6" height="6" />
                  <rect x="52" y="75" width="6" height="6" />
                  <rect x="65" y="65" width="10" height="10" />
                  <rect x="80" y="75" width="12" height="12" />
                </svg>
              </div>

              {/* Action Link Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={copyTrackerLink}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1ADBDE] py-2.5 font-bold text-[#0D1116] hover:bg-[#4AE5E8]"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-[#0D1116]" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'LINK TRACKER DISALIN!' : 'SALIN LINK TRACKER HP'}
                </button>

                <a
                  href={trackerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A3036] bg-[#151A1F] py-2 font-semibold text-[#C8D0D6] hover:border-[#1ADBDE]/50 hover:text-[#1ADBDE]"
                >
                  <ExternalLink className="h-4 w-4 text-[#1ADBDE]" />
                  Buka Halaman Pemancar GPS di Tab Ini
                </a>
              </div>
            </div>
          )}

          {tab === 'direct' && (
            <div className="space-y-4 text-center">
              <div className="rounded-lg border border-[#1ADBDE]/30 bg-[#1ADBDE]/10 p-3 text-xs text-[#A0AABC]">
                Gunakan GPS browser komputer / laptop Anda secara langsung untuk mentransmisikan lokasi ke peta.
              </div>

              {mobileGpsError && (
                <div className="flex items-start gap-2 rounded-lg border border-[#D6403E]/40 bg-[#D6403E]/10 p-3 text-xs text-[#D6403E] text-left">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{mobileGpsError}</span>
                </div>
              )}

              <div className="flex flex-col items-center justify-center py-4">
                <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full border ${
                  mobileGpsActive
                    ? 'border-[#3AC7A3] bg-[#3AC7A3]/10 text-[#3AC7A3] animate-pulse'
                    : 'border-[#2A3036] bg-[#1A2026] text-[#7A848C]'
                }`}>
                  <Navigation className="h-7 w-7" />
                </div>

                <div className="text-xs font-semibold text-[#E8ECEF]">
                  STATUS GPS: {mobileGpsActive ? (
                    <span className="text-[#3AC7A3]">● LIVE LOGGING</span>
                  ) : (
                    <span className="text-[#7A848C]">OFFLINE</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleMobileGps}
                className={`w-full rounded-lg py-2.5 font-bold transition-all ${
                  mobileGpsActive
                    ? 'bg-[#D6403E] text-white hover:bg-[#E54D4B]'
                    : 'bg-[#1ADBDE] text-[#0D1116] hover:bg-[#4AE5E8]'
                }`}
              >
                {mobileGpsActive ? 'Matikan Sinyal GPS' : 'Aktifkan Sinyal GPS Perangkat Ini'}
              </button>
            </div>
          )}

          {tab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-3.5">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-6 text-center text-[#3AC7A3]">
                  <CheckCircle2 className="mb-2 h-10 w-10 animate-bounce" />
                  <div className="font-semibold text-sm">Unit Berhasil Ditambahkan!</div>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="add-device-unit-label" className="mb-1 block font-semibold text-[#A0AABC]">Nomor Lambung / ID Unit</label>
                    <input
                      id="add-device-unit-label"
                      name="unitLabel"
                      type="text"
                      required
                      value={unitLabel}
                      onChange={(e) => setUnitLabel(e.target.value)}
                      placeholder="Contoh: HT-999"
                      className="w-full rounded-md border border-[#2A3036] bg-[#151A1F] px-3 py-2 font-mono text-xs text-[#E8ECEF] focus:border-[#1ADBDE] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-device-armada-type" className="mb-1 block font-semibold text-[#A0AABC]">Tipe Armada</label>
                    <select
                      id="add-device-armada-type"
                      name="armadaType"
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full rounded-md border border-[#2A3036] bg-[#151A1F] px-3 py-2 text-xs text-[#E8ECEF] focus:border-[#1ADBDE] focus:outline-none"
                    >
                      <option value="haul">Truck Hauler</option>
                      <option value="excavator">Excavator / Heavy Equipment</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="add-device-operator-name" className="mb-1 block font-semibold text-[#A0AABC]">Nama Operator</label>
                    <input
                      id="add-device-operator-name"
                      name="operatorName"
                      type="text"
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      placeholder="Nama Driver"
                      className="w-full rounded-md border border-[#2A3036] bg-[#151A1F] px-3 py-2 text-xs text-[#E8ECEF] focus:border-[#1ADBDE] focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md border border-[#2A3036] bg-[#1A2026] px-3.5 py-1.5 font-semibold text-[#C8D0D6]"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-md bg-[#1ADBDE] px-4 py-1.5 font-semibold text-[#0D1116]"
                    >
                      <Plus className="h-4 w-4" /> Simpan Unit
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
