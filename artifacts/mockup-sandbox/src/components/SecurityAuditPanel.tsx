import React from 'react';
import { WifiScanResult } from '../types/wifi';
import { getSecurityBadge } from '../utils/wifiCalculations';

interface SecurityAuditPanelProps {
  results: WifiScanResult[];
  onSelectAp: (ap: WifiScanResult) => void;
}

export const SecurityAuditPanel: React.FC<SecurityAuditPanelProps> = ({ results, onSelectAp }) => {
  const openNetworks = results.filter((r) => !r.capabilities.includes('WPA') && !r.capabilities.includes('WEP') && !r.capabilities.includes('RSN'));
  const wepNetworks = results.filter((r) => r.capabilities.includes('WEP'));
  const wpaLegacy = results.filter((r) => r.capabilities.includes('TKIP') && !r.capabilities.includes('WPA3'));
  const wpa3Networks = results.filter((r) => r.capabilities.includes('WPA3') || r.capabilities.includes('SAE'));

  // Detect potential Evil Twin / Rogue APs (multiple BSSIDs broadcasting the same SSID on different channels)
  const ssidCounts = results.reduce<Record<string, WifiScanResult[]>>((acc, ap) => {
    if (ap.ssid && ap.ssid !== '<hidden SSID>') {
      acc[ap.ssid] = acc[ap.ssid] || [];
      acc[ap.ssid].push(ap);
    }
    return acc;
  }, {});

  const potentialMultiApSsids = Object.entries(ssidCounts).filter(([_, aps]) => aps.length > 1);

  return (
    <div className="bg-[#07100D] border border-[#185C38] rounded-xl p-4 font-mono text-zinc-200">
      <div className="flex items-center justify-between border-b border-[#185C38]/60 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold text-sm">◈ RF SECURITY & ENCRYPTION AUDIT</span>
        </div>
        <span className="text-[11px] text-zinc-400">Passive Telemetry Analysis</span>
      </div>

      {/* Security Summary Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-[#030604] border border-emerald-500/30 rounded-lg p-2.5">
          <div className="text-[10px] text-zinc-400">WPA3 (SECURE)</div>
          <div className="text-base font-bold text-emerald-400 mt-0.5">{wpa3Networks.length} APs</div>
          <div className="text-[10px] text-zinc-500">Protected Management Frames</div>
        </div>

        <div className="bg-[#030604] border border-cyan-500/30 rounded-lg p-2.5">
          <div className="text-[10px] text-zinc-400">WPA2 (STANDARD)</div>
          <div className="text-base font-bold text-cyan-400 mt-0.5">
            {results.length - openNetworks.length - wepNetworks.length - wpa3Networks.length} APs
          </div>
          <div className="text-[10px] text-zinc-500">AES-CCMP Encryption</div>
        </div>

        <div className="bg-[#030604] border border-rose-500/40 rounded-lg p-2.5">
          <div className="text-[10px] text-zinc-400">OPEN / UNENCRYPTED</div>
          <div className="text-base font-bold text-rose-400 mt-0.5">{openNetworks.length} APs</div>
          <div className="text-[10px] text-rose-300/70">Cleartext Payload Risk</div>
        </div>

        <div className="bg-[#030604] border border-amber-500/40 rounded-lg p-2.5">
          <div className="text-[10px] text-zinc-400">MULTI-AP / MESH</div>
          <div className="text-base font-bold text-amber-400 mt-0.5">{potentialMultiApSsids.length} SSIDs</div>
          <div className="text-[10px] text-zinc-500">Roaming / Co-channel</div>
        </div>
      </div>

      {/* Security Findings List */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
        {openNetworks.length > 0 && (
          <div className="bg-rose-950/30 border border-rose-500/40 rounded-lg p-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-1">
              <span>⚠️ UNENCRYPTED NETWORKS DETECTED ({openNetworks.length})</span>
            </div>
            <p className="text-[11px] text-zinc-300 mb-2">
              Wireless frames transmitted over open networks can be captured passively by packet sniffers.
            </p>
            <div className="space-y-1">
              {openNetworks.map((ap) => (
                <div
                  key={ap.bssid}
                  onClick={() => onSelectAp(ap)}
                  className="flex items-center justify-between text-[11px] bg-[#030604] p-1.5 rounded cursor-pointer hover:bg-zinc-800"
                >
                  <span className="text-white font-semibold">{ap.ssid || '<hidden>'}</span>
                  <span className="text-zinc-400">{ap.bssid} • CH {ap.channel}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {potentialMultiApSsids.length > 0 && (
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
              <span>◈ MULTI-BSSID SSIDS / ROAMING CLUSTERS</span>
            </div>
            <p className="text-[11px] text-zinc-300 mb-2">
              Legitimate enterprise mesh nodes or potential evil-twin duplicate broadcast SSIDs:
            </p>
            <div className="space-y-2">
              {potentialMultiApSsids.map(([ssid, aps]) => (
                <div key={ssid} className="bg-[#030604] p-2 rounded text-[11px]">
                  <div className="text-[#66FFAA] font-bold mb-1">"{ssid}" ({aps.length} nodes)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {aps.map((ap) => (
                      <div
                        key={ap.bssid}
                        onClick={() => onSelectAp(ap)}
                        className="text-zinc-400 hover:text-white cursor-pointer bg-zinc-900/60 p-1 rounded flex justify-between"
                      >
                        <span>{ap.bssid}</span>
                        <span className="text-[#00FFFF]">{ap.level} dBm (CH {ap.channel})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
