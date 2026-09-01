import React from 'react';
import { WifiScanResult, SignalAnalysis } from '../types/wifi';
import { SignalHistoryGraph } from './SignalHistoryGraph';
import { getSecurityBadge, getRssiColor } from '../utils/wifiCalculations';

interface SelectedApInspectorProps {
  ap: WifiScanResult | null;
  history: number[];
  analysis: SignalAnalysis;
  onCalibrate: () => void;
  onUpdatePathLoss: (newVal: number) => void;
  onUpdateReferenceRssi: (newVal: number) => void;
  statusMessage?: string;
}

export const SelectedApInspector: React.FC<SelectedApInspectorProps> = ({
  ap,
  history,
  analysis,
  onCalibrate,
  onUpdatePathLoss,
  onUpdateReferenceRssi,
  statusMessage,
}) => {
  if (!ap) {
    return (
      <div className="bg-[#07100D] border border-[#185C38]/80 rounded-xl p-5 font-mono text-center text-zinc-400">
        <div className="text-[#66FFAA] text-sm font-semibold mb-2">◈ AP INSPECTOR</div>
        <p className="text-xs text-zinc-500">SELECT AN ACCESS POINT FROM RADAR OR LIST TO INSPECT</p>
      </div>
    );
  }

  const security = getSecurityBadge(ap.capabilities);
  const rssiStyle = getRssiColor(ap.level);

  return (
    <div className="bg-[#07100D] border border-[#185C38] rounded-xl p-4 font-mono text-zinc-200 shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#185C38]/60 pb-3 mb-3">
        <div>
          <div className="text-[11px] text-[#00FFFF] font-bold tracking-wider mb-0.5">SELECTED AP</div>
          <h2 className="text-base font-bold text-white tracking-wide truncate max-w-[260px] sm:max-w-xs">
            {ap.ssid || '<hidden SSID>'}
          </h2>
          <div className="text-[11px] text-zinc-400 mt-0.5">{ap.bssid} • {ap.vendor || 'Standard Radio'}</div>
        </div>

        <div className="text-right">
          <div className={`text-lg font-extrabold ${rssiStyle.text}`}>
            {ap.level} <span className="text-xs font-normal">dBm</span>
          </div>
          <div className="text-xs text-emerald-400 font-semibold">{ap.signalPercent}% Quality</div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="bg-[#030604] border border-[#185C38]/50 rounded-lg p-2">
          <div className="text-[10px] text-zinc-400">BAND / FREQ</div>
          <div className="text-xs font-bold text-white mt-0.5">{ap.band}</div>
          <div className="text-[10px] text-[#66FFAA]">{ap.frequency} MHz</div>
        </div>

        <div className="bg-[#030604] border border-[#185C38]/50 rounded-lg p-2">
          <div className="text-[10px] text-zinc-400">CHANNEL</div>
          <div className="text-xs font-bold text-[#00FFFF] mt-0.5">CH {ap.channel}</div>
          <div className="text-[10px] text-zinc-400">Spectrum ID</div>
        </div>

        <div className="bg-[#030604] border border-[#185C38]/50 rounded-lg p-2">
          <div className="text-[10px] text-zinc-400">EST. DISTANCE</div>
          <div className="text-xs font-bold text-emerald-300 mt-0.5">
            {analysis.estimatedDistance.toFixed(1)} m
          </div>
          <div className="text-[10px] text-zinc-400">Log-loss model</div>
        </div>

        <div className="bg-[#030604] border border-[#185C38]/50 rounded-lg p-2">
          <div className="text-[10px] text-zinc-400">CONFIDENCE</div>
          <div
            className={`text-xs font-bold mt-0.5 ${
              analysis.confidence === 'HIGH'
                ? 'text-emerald-400'
                : analysis.confidence === 'MEDIUM'
                ? 'text-yellow-400'
                : 'text-rose-400'
            }`}
          >
            {analysis.confidence}
          </div>
          <div className="text-[10px] text-zinc-400">{analysis.sampleCount} samples</div>
        </div>
      </div>

      {/* Signal Analysis Sub-panel */}
      <div className="bg-[#030604] border border-[#185C38]/70 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between text-[11px] text-[#00FFFF] font-bold mb-2">
          <span>◈ STATISTICAL SIGNAL ANALYSIS</span>
          <span className="text-[10px] text-zinc-400">Real-time RF Telemetry</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-zinc-400 block">Average Signal</span>
            <span className="font-bold text-white">{analysis.average} dBm</span>
          </div>

          <div>
            <span className="text-[10px] text-zinc-400 block">Variation (StdDev)</span>
            <span className="font-bold text-teal-300">± {analysis.stdDev} dB</span>
          </div>

          <div>
            <span className="text-[10px] text-zinc-400 block">Signal Trend</span>
            <span
              className={`font-bold ${
                analysis.trend.includes('IMPROVING')
                  ? 'text-emerald-400'
                  : analysis.trend.includes('WEAKENING')
                  ? 'text-rose-400'
                  : 'text-cyan-300'
              }`}
            >
              {analysis.trend}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-zinc-400 block">1m Calibrated RSSI</span>
            <span className="font-bold text-cyan-400">{analysis.referenceRssi} dBm</span>
          </div>

          <div>
            <span className="text-[10px] text-zinc-400 block">Path-Loss Exponent (n)</span>
            <span className="font-bold text-white">{analysis.pathLoss.toFixed(1)}</span>
          </div>

          <div>
            <span className="text-[10px] text-zinc-400 block">Security Mode</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-block mt-0.5 ${security.color}`}>
              {security.label}
            </span>
          </div>
        </div>
      </div>

      {/* Signal History Waveform Chart */}
      <div className="mb-3">
        <SignalHistoryGraph
          history={history}
          bssid={ap.bssid}
          ssid={ap.ssid}
          referenceRssi={analysis.referenceRssi}
        />
      </div>

      {/* Calibration and Fine-Tuning Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-[#185C38]/40">
        <button
          onClick={onCalibrate}
          className="flex-1 bg-[#123C2A] hover:bg-[#1a553b] text-[#66FFAA] hover:text-white border border-[#00FF66]/40 hover:border-[#00FF66] py-2 px-3 rounded-lg text-xs font-bold transition-all shadow cursor-pointer flex items-center justify-center gap-1.5"
          title="Use current average RSSI as the 1-meter reference baseline for distance calculation"
        >
          <span>🎯</span>
          <span>CALIBRATE SELECTED AP @ 1M</span>
        </button>

        <div className="flex items-center gap-2 bg-[#030604] border border-[#185C38] px-3 py-1.5 rounded-lg text-xs">
          <span className="text-zinc-400 text-[10px] whitespace-nowrap">Path-Loss:</span>
          <input
            type="range"
            min="1.6"
            max="4.0"
            step="0.1"
            value={analysis.pathLoss}
            onChange={(e) => onUpdatePathLoss(parseFloat(e.target.value))}
            className="w-20 accent-[#00FF66] cursor-pointer"
          />
          <span className="text-[#66FFAA] text-[11px] font-bold w-6 text-right">
            {analysis.pathLoss.toFixed(1)}
          </span>
        </div>
      </div>

      {statusMessage && (
        <div className="mt-2 text-center text-[10px] text-[#00FFFF] bg-[#00FFFF]/10 border border-[#00FFFF]/30 py-1 rounded">
          {statusMessage}
        </div>
      )}
    </div>
  );
};
