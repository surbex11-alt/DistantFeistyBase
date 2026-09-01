import React, { useState, useMemo } from 'react';
import { WifiScanResult } from '../types/wifi';
import { getSecurityBadge, getRssiColor } from '../utils/wifiCalculations';

interface ApListProps {
  results: WifiScanResult[];
  selectedBssid: string | null;
  onSelectAp: (ap: WifiScanResult) => void;
}

export const ApList: React.FC<ApListProps> = ({ results, selectedBssid, onSelectAp }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBand, setFilterBand] = useState<'ALL' | '2.4 GHz' | '5 GHz' | '6 GHz'>('ALL');
  const [sortBy, setSortBy] = useState<'SIGNAL' | 'SSID' | 'CHANNEL'>('SIGNAL');

  const filteredAndSorted = useMemo(() => {
    let list = results.filter((ap) => {
      const matchSearch =
        ap.ssid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ap.bssid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ap.vendor && ap.vendor.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchBand = filterBand === 'ALL' || ap.band === filterBand;
      return matchSearch && matchBand;
    });

    return list.sort((a, b) => {
      if (sortBy === 'SIGNAL') return b.level - a.level;
      if (sortBy === 'SSID') return a.ssid.localeCompare(b.ssid);
      if (sortBy === 'CHANNEL') return a.channel - b.channel;
      return 0;
    });
  }, [results, searchTerm, filterBand, sortBy]);

  // Export results to JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(results, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `wifi-sentinel-scan-${new Date().toISOString().slice(0, 19)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export results to CSV
  const handleExportCsv = () => {
    const headers = ['SSID', 'BSSID', 'RSSI_dBm', 'Signal_Percent', 'Channel', 'Band', 'Frequency_MHz', 'Security', 'Vendor'];
    const rows = results.map((ap) => [
      `"${ap.ssid.replace(/"/g, '""')}"`,
      `"${ap.bssid}"`,
      ap.level,
      ap.signalPercent,
      ap.channel,
      `"${ap.band}"`,
      ap.frequency,
      `"${ap.capabilities.replace(/"/g, '""')}"`,
      `"${(ap.vendor || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `wifi-sentinel-scan-${new Date().toISOString().slice(0, 19)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-[#07100D] border border-[#185C38] rounded-xl p-4 font-mono text-zinc-200">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#185C38]/60 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[#00FF66] font-bold text-sm">◈ VISIBLE ACCESS POINTS</span>
          <span className="text-xs text-[#00FFFF] bg-[#00FFFF]/10 border border-[#00FFFF]/30 px-2 py-0.5 rounded font-bold">
            {results.length} DETECTED
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleExportCsv}
            className="px-2.5 py-1 rounded bg-[#030604] hover:bg-[#123C2A] text-zinc-300 hover:text-[#66FFAA] border border-[#185C38] transition-colors"
          >
            EXPORT CSV
          </button>
          <button
            onClick={handleExportJson}
            className="px-2.5 py-1 rounded bg-[#030604] hover:bg-[#123C2A] text-zinc-300 hover:text-[#66FFAA] border border-[#185C38] transition-colors"
          >
            EXPORT JSON
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3 text-xs">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Filter SSID, BSSID, or Vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#030604] border border-[#185C38] rounded-lg px-3 py-1.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF66]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1.5 text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <select
            value={filterBand}
            onChange={(e) => setFilterBand(e.target.value as any)}
            className="bg-[#030604] border border-[#185C38] rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-[#00FF66]"
          >
            <option value="ALL">ALL BANDS</option>
            <option value="2.4 GHz">2.4 GHz</option>
            <option value="5 GHz">5 GHz</option>
            <option value="6 GHz">6 GHz</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#030604] border border-[#185C38] rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-[#00FF66]"
          >
            <option value="SIGNAL">SORT: SIGNAL</option>
            <option value="SSID">SORT: SSID</option>
            <option value="CHANNEL">SORT: CHANNEL</option>
          </select>
        </div>
      </div>

      {/* Access Points List */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {filteredAndSorted.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-xs">
            NO ACCESS POINTS MATCHING FILTER
          </div>
        ) : (
          filteredAndSorted.map((ap) => {
            const isSelected = selectedBssid === ap.bssid;
            const security = getSecurityBadge(ap.capabilities);
            const rssiStyle = getRssiColor(ap.level);

            return (
              <div
                key={ap.bssid}
                onClick={() => onSelectAp(ap)}
                className={`p-3 rounded-lg border transition-all cursor-pointer font-mono ${
                  isSelected
                    ? 'bg-[#0b2118] border-[#00FFFF] shadow-[0_0_12px_rgba(0,255,255,0.15)]'
                    : 'bg-[#030604] border-[#185C38]/60 hover:border-[#00FF66]/60 hover:bg-[#06140e]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm truncate">
                        {ap.ssid || '<hidden SSID>'}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-[#00FFFF]/20 text-[#00FFFF] px-1.5 py-0.2 rounded border border-[#00FFFF]/40">
                          ACTIVE TARGET
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#66FFAA] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`font-bold ${rssiStyle.text}`}>{ap.level} dBm</span>
                      <span>{ap.signalPercent}%</span>
                      <span className="text-[#00FFFF]">CH {ap.channel}</span>
                      <span className="text-purple-300">{ap.band}</span>
                      <span className="text-zinc-400 text-[11px]">{ap.frequency} MHz</span>
                    </div>

                    <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
                      <span className="text-zinc-400">{ap.bssid}</span>
                      {ap.vendor && <span className="text-zinc-500">{ap.vendor}</span>}
                    </div>

                    <div className="mt-1.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border inline-block ${security.color}`}>
                        {security.label}
                      </span>
                    </div>
                  </div>

                  {/* Signal Strength Visual Meter */}
                  <div className="w-12 flex flex-col items-end shrink-0">
                    <div className="flex items-end gap-0.5 h-6">
                      {[20, 40, 60, 80, 100].map((threshold, idx) => (
                        <div
                          key={threshold}
                          className={`w-1.5 rounded-xs transition-all ${
                            ap.signalPercent >= threshold
                              ? rssiStyle.bar
                              : 'bg-zinc-800'
                          }`}
                          style={{ height: `${(idx + 1) * 20}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
