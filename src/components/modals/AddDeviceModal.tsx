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
import { QRCodeSVG } from 'qrcode.react';
import { useOps } from '../../contexts/OpsContext';
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
  const { generateFullDeviceInvite } = useOps();
  const [tab, setTab] = useState<'qr' | 'direct' | 'manual'>('qr');
  const [copied, setCopied] = useState(false);
  const [unitLabel, setUnitLabel] = useState('HT-888');
  const [type, setType] = useState<'haul' | 'excavator'>('haul');
  const [operator, setOperator] = useState('Budi S.');
  const [submitted, setSubmitted] = useState(false);

  // States for Auto-Link / QR Generation
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrUnitLabel, setQrUnitLabel] = useState('');
  const [qrOperator, setQrOperator] = useState('');
  const [qrDeviceName, setQrDeviceName] = useState('HP Tracker');
  const [qrArmadaType, setQrArmadaType] = useState('haul');

  if (!isOpen) return null;

  const handleGenerateLink = async (e: FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const { url } = await generateFullDeviceInvite({
        unitLabel: qrUnitLabel,
        operatorName: qrOperator,
        deviceName: qrDeviceName,
        armadaType: qrArmadaType,
      });
      setGeneratedUrl(url);
    } catch (e) {
      console.error(e);
    }
    setIsGenerating(false);
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
              {!generatedUrl ? (
                <form onSubmit={handleGenerateLink} className="space-y-3.5 text-left">
                  <p className="text-[#A0AABC] leading-relaxed text-center mb-4">
                    Isi data unit dan operator terlebih dahulu untuk membuat link tracker & QR Code otomatis.
                  </p>
                  <div>
                    <label className="mb-1 block font-semibold text-[#A0AABC]">Nomor Lambung / ID Unit</label>
                    <input type="text" required value={qrUnitLabel} onChange={e => setQrUnitLabel(e.target.value)} placeholder="Contoh: HT-999" className="w-full rounded-md border border-[#2A3036] bg-[#151A1F] px-3 py-2 font-mono text-xs text-[#E8ECEF] focus:border-[#1ADBDE] focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#A0AABC]">Nama Operator / Driver</label>
                    <input type="text" required value={qrOperator} onChange={e => setQrOperator(e.target.value)} placeholder="Nama Operator" className="w-full rounded-md border border-[#2A3036] bg-[#151A1F] px-3 py-2 font-mono text-xs text-[#E8ECEF] focus:border-[#1ADBDE] focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#A0AABC]">Nama Perangkat HP</label>
                    <input type="text" required value={qrDeviceName} onChange={e => setQrDeviceName(e.target.value)} placeholder="Contoh: HP Budi" className="w-full rounded-md border border-[#2A3036] bg-[#151A1F] px-3 py-2 font-mono text-xs text-[#E8ECEF] focus:border-[#1ADBDE] focus:outline-none" />
                  </div>
                  <button type="submit" disabled={isGenerating} className="mt-2 w-full rounded-lg bg-[#1ADBDE] py-2.5 font-bold text-[#0D1116] hover:bg-[#4AE5E8] disabled:opacity-50">
                    {isGenerating ? 'Membuat Link...' : 'Buat Link Tracker & QR Code'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4 text-center">
                  <p className="text-[#A0AABC] leading-relaxed">
                    Scan QR Code ini menggunakan kamera HP Anda atau klik tombol salin link untuk mentransmisikan lokasi pergerakan HP ke peta secara langsung!
                  </p>
                  <div className="mx-auto flex h-44 w-44 flex-col items-center justify-center rounded-xl border border-[#2A3036] bg-white p-3 shadow-inner">
                    <QRCodeSVG value={generatedUrl} size={150} level="M" />
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1ADBDE] py-2.5 font-bold text-[#0D1116] hover:bg-[#4AE5E8]"
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4 text-[#0D1116]" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'LINK TRACKER DISALIN!' : 'SALIN LINK TRACKER HP'}
                    </button>
                  </div>
                  <button type="button" onClick={() => setGeneratedUrl(null)} className="mt-2 text-xs font-semibold text-[#1ADBDE] hover:underline">
                    ← Buat Link Baru
                  </button>
                </div>
              )}
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
