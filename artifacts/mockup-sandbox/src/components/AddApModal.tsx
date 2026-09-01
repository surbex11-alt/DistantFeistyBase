import React, { useState } from 'react';
import { WifiScanResult } from '../types/wifi';
import { calculateChannel, calculateBand, calculateSignalPercent } from '../utils/wifiCalculations';

interface AddApModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAp: (ap: WifiScanResult) => void;
}

export const AddApModal: React.FC<AddApModalProps> = ({ isOpen, onClose, onAddAp }) => {
  const [ssid, setSsid] = useState('');
  const [bssid, setBssid] = useState(() => {
    return Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()
    ).join(':');
  });
  const [level, setLevel] = useState<number>(-50);
  const [frequency, setFrequency] = useState<number>(5180);
  const [capabilities, setCapabilities] = useState('[WPA2-PSK-CCMP][ESS]');
  const [vendor, setVendor] = useState('Custom Test Radio');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newAp: WifiScanResult = {
      ssid: ssid.trim() || '<hidden SSID>',
      bssid: bssid.trim(),
      level: Number(level),
      frequency: Number(frequency),
      capabilities,
      timestamp: Date.now(),
      channel: calculateChannel(Number(frequency)),
      band: calculateBand(Number(frequency)),
      signalPercent: calculateSignalPercent(Number(level)),
      vendor,
      isCustom: true,
    };
    onAddAp(newAp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 font-mono">
      <div className="bg-[#07100D] border border-[#00FF66] rounded-xl p-5 w-full max-w-md shadow-2xl text-zinc-200">
        <div className="flex items-center justify-between border-b border-[#185C38] pb-3 mb-4">
          <div className="text-sm font-bold text-[#00FF66]">◈ INJECT ACCESS POINT BEACON</div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-base">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1">SSID (NETWORK NAME)</label>
            <input
              type="text"
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
              placeholder="e.g. Rogue-AP-Test"
              className="w-full bg-[#030604] border border-[#185C38] rounded p-2 text-white focus:outline-none focus:border-[#00FF66]"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">BSSID (MAC ADDRESS)</label>
            <input
              type="text"
              value={bssid}
              onChange={(e) => setBssid(e.target.value)}
              className="w-full bg-[#030604] border border-[#185C38] rounded p-2 text-white focus:outline-none focus:border-[#00FF66]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-zinc-400 mb-1">RSSI LEVEL (dBm)</label>
              <input
                type="number"
                min="-100"
                max="-20"
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full bg-[#030604] border border-[#185C38] rounded p-2 text-[#66FFAA] focus:outline-none focus:border-[#00FF66]"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">FREQUENCY (MHz)</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="w-full bg-[#030604] border border-[#185C38] rounded p-2 text-white focus:outline-none focus:border-[#00FF66]"
              >
                <option value={2412}>2412 MHz (CH 1, 2.4G)</option>
                <option value={2437}>2437 MHz (CH 6, 2.4G)</option>
                <option value={2462}>2462 MHz (CH 11, 2.4G)</option>
                <option value={5180}>5180 MHz (CH 36, 5G)</option>
                <option value={5240}>5240 MHz (CH 48, 5G)</option>
                <option value={5745}>5745 MHz (CH 149, 5G)</option>
                <option value={5975}>5975 MHz (CH 5, 6G)</option>
                <option value={6115}>6115 MHz (CH 33, 6G)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">ENCRYPTION / CAPABILITIES</label>
            <select
              value={capabilities}
              onChange={(e) => setCapabilities(e.target.value)}
              className="w-full bg-[#030604] border border-[#185C38] rounded p-2 text-white focus:outline-none focus:border-[#00FF66]"
            >
              <option value="[WPA3-SAE-CCMP][ESS]">WPA3-SAE (Personal)</option>
              <option value="[WPA2-PSK-CCMP][ESS]">WPA2-PSK (AES)</option>
              <option value="[WPA3-Enterprise-EAP][ESS]">WPA3-Enterprise (802.1X)</option>
              <option value="[WPA-TKIP][ESS]">WPA Legacy (TKIP)</option>
              <option value="[WEP][ESS]">WEP (Deprecated)</option>
              <option value="[ESS]">Open / Unencrypted</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">VENDOR / HARDWARE</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Cisco, Aruba, Ubiquiti"
              className="w-full bg-[#030604] border border-[#185C38] rounded p-2 text-white focus:outline-none focus:border-[#00FF66]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#185C38] mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#030604] text-zinc-400 hover:text-white border border-[#185C38]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-[#00FF66] text-[#001a08] font-bold hover:bg-[#00e65c] transition-colors"
            >
              INJECT BEACON
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
