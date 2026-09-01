import React, { useState, useMemo } from 'react';
import { WifiScanResult } from '../types/wifi';

interface ChannelAnalyzerProps {
  results: WifiScanResult[];
  onSelectAp?: (ap: WifiScanResult) => void;
}

export const ChannelAnalyzer: React.FC<ChannelAnalyzerProps> = ({ results, onSelectAp }) => {
  const [activeBand, setActiveBand] = useState<'2.4 GHz' | '5 GHz' | '6 GHz' | 'all'>('2.4 GHz');

  // Group APs by channel
  const channelData = useMemo(() => {
    const counts: Record<number, { count: number; aps: WifiScanResult[]; band: string }> = {};

    results.forEach((ap) => {
      if (ap.channel > 0) {
        if (!counts[ap.channel]) {
          counts[ap.channel] = { count: 0, aps: [], band: ap.band };
        }
        counts[ap.channel].count += 1;
        counts[ap.channel].aps.push(ap);
      }
    });

    return counts;
  }, [results]);

  // Standard channels definition
  const standard24Channels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const standard5Channels = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 149, 153, 157, 161, 165];
  const standard6Channels = [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 53, 57, 61, 65, 69, 73, 77, 81, 85, 89, 93];

  const displayedChannels = useMemo(() => {
    if (activeBand === '2.4 GHz') {
      return standard24Channels.map((ch) => ({
        channel: ch,
        band: '2.4 GHz',
        count: channelData[ch]?.count || 0,
        aps: channelData[ch]?.aps || [],
        isRecommended: ch === 1 || ch === 6 || ch === 11,
      }));
    }
    if (activeBand === '5 GHz') {
      return standard5Channels.map((ch) => ({
        channel: ch,
        band: '5 GHz',
        count: channelData[ch]?.count || 0,
        aps: channelData[ch]?.aps || [],
        isRecommended: ch === 36 || ch === 48 || ch === 149 || ch === 161,
      }));
    }
    if (activeBand === '6 GHz') {
      return standard6Channels.map((ch) => ({
        channel: ch,
        band: '6 GHz',
        count: channelData[ch]?.count || 0,
        aps: channelData[ch]?.aps || [],
        isRecommended: ch === 37 || ch === 69,
      }));
    }
    // All active channels
    const channels = Object.keys(channelData)
      .map(Number)
      .sort((a, b) => a - b);
    return channels.map((ch) => ({
      channel: ch,
      band: channelData[ch].band,
      count: channelData[ch].count,
      aps: channelData[ch].aps,
      isRecommended: ch === 1 || ch === 6 || ch === 11 || ch === 36,
    }));
  }, [activeBand, channelData]);

  const maxCount = useMemo(() => {
    return Math.max(1, ...displayedChannels.map((c) => c.count));
  }, [displayedChannels]);

  // Optimal channel recommendation for 2.4 GHz
  const recommendation24 = useMemo(() => {
    const ch1 = channelData[1]?.count || 0;
    const ch6 = channelData[6]?.count || 0;
    const ch11 = channelData[11]?.count || 0;
    const minCount = Math.min(ch1, ch6, ch11);
    const bestChannels: number[] = [];
    if (ch1 === minCount) bestChannels.push(1);
    if (ch6 === minCount) bestChannels.push(6);
    if (ch11 === minCount) bestChannels.push(11);
    return { bestChannels, minCount };
  }, [channelData]);

  return (
    <div className="bg-[#07100D] border border-[#185C38] rounded-xl p-4 font-mono text-zinc-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#185C38]/60 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[#00FFFF] font-bold text-sm">◈ CHANNEL ANALYZER & SPECTRUM CONGESTION</span>
        </div>

        {/* Band filter tabs */}
        <div className="flex items-center gap-1 bg-[#030604] border border-[#185C38] p-1 rounded-lg text-xs">
          {(['2.4 GHz', '5 GHz', '6 GHz', 'all'] as const).map((band) => (
            <button
              key={band}
              onClick={() => setActiveBand(band)}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeBand === band
                  ? 'bg-[#123C2A] text-[#66FFAA] font-bold border border-[#00FF66]/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {band.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendation Banner */}
      {activeBand === '2.4 GHz' && (
        <div className="bg-[#030604] border border-[#185C38]/80 rounded-lg p-2.5 mb-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">★ SPECTRUM RECOMMENDATION:</span>
            <span className="text-zinc-300">
              Cleanest non-overlapping 2.4GHz: Channel{' '}
              <strong className="text-[#00FFFF]">CH {recommendation24.bestChannels.join(', CH ')}</strong> ({recommendation24.minCount} APs active)
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 hidden sm:inline">20MHz Co-channel Guard</span>
        </div>
      )}

      {/* Channel Bars Visualization */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {displayedChannels.map((item) => {
          const barRatio = item.count / maxCount;
          const isHighCongestion = item.count >= 3;
          const isModerate = item.count === 2;

          return (
            <div
              key={`${item.band}-${item.channel}`}
              className={`flex items-center gap-2 p-1.5 rounded transition-colors ${
                item.count > 0 ? 'bg-[#030604] hover:bg-[#0c1c14]' : 'bg-[#030604]/40 text-zinc-600'
              }`}
            >
              {/* Channel Label */}
              <div className="w-16 flex items-center gap-1.5 shrink-0 text-xs">
                <span className={`font-bold ${item.count > 0 ? 'text-[#66FFAA]' : 'text-zinc-500'}`}>
                  CH {item.channel.toString().padStart(2, ' ')}
                </span>
                {item.isRecommended && (
                  <span className="text-[9px] text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-1 rounded">
                    REC
                  </span>
                )}
              </div>

              {/* Dynamic Bar Graph (matches original ASCII bar ████) */}
              <div className="flex-1 bg-zinc-900/60 rounded h-5 flex items-center px-1 overflow-hidden relative border border-zinc-800">
                <div
                  className={`h-3.5 rounded transition-all duration-300 ${
                    isHighCongestion
                      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                      : isModerate
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                      : item.count > 0
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                      : 'bg-transparent'
                  }`}
                  style={{ width: `${Math.max(item.count > 0 ? 8 : 0, barRatio * 100)}%` }}
                />
                {item.count > 0 && (
                  <span className="absolute right-2 text-[10px] text-zinc-300 font-bold">
                    {item.count} AP{item.count > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Connected AP names preview */}
              <div className="w-36 sm:w-48 text-[10px] text-zinc-400 truncate shrink-0">
                {item.aps.map((ap, i) => (
                  <span
                    key={ap.bssid}
                    onClick={() => onSelectAp && onSelectAp(ap)}
                    className="hover:text-[#00FFFF] cursor-pointer"
                  >
                    {ap.ssid || '<hidden>'}
                    {i < item.aps.length - 1 ? ', ' : ''}
                  </span>
                ))}
                {item.count === 0 && <span className="text-zinc-600">Clear channel</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
