import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { WifiScanResult, SignalAnalysis, NetworkEnvironmentPreset } from './types/wifi';
import { ENVIRONMENT_PRESETS } from './data/presets';
import { analyzeSignalHistory, calculateSignalPercent } from './utils/wifiCalculations';
import { RadarDisplay } from './components/RadarDisplay';
import { SelectedApInspector } from './components/SelectedApInspector';
import { ChannelAnalyzer } from './components/ChannelAnalyzer';
import { CooperativeNodeNetwork } from './components/CooperativeNodeNetwork';
import { ApList } from './components/ApList';
import { SecurityAuditPanel } from './components/SecurityAuditPanel';
import { AddApModal } from './components/AddApModal';

export function App() {
  const [currentPreset, setCurrentPreset] = useState<NetworkEnvironmentPreset>(ENVIRONMENT_PRESETS[0]);
  const [results, setResults] = useState<WifiScanResult[]>(() => ENVIRONMENT_PRESETS[0].initialAps);
  const [selectedBssid, setSelectedBssid] = useState<string | null>(() => ENVIRONMENT_PRESETS[0].initialAps[0]?.bssid || null);
  const [history, setHistory] = useState<Record<string, number[]>>(() => {
    const initialMap: Record<string, number[]> = {};
    ENVIRONMENT_PRESETS[0].initialAps.forEach((ap) => {
      // Seed with initial baseline readings
      initialMap[ap.bssid] = [ap.level - 2, ap.level + 1, ap.level - 1, ap.level];
    });
    return initialMap;
  });

  const [referenceRssi, setReferenceRssi] = useState<number>(-45);
  const [pathLoss, setPathLoss] = useState<number>(2.4);
  const [statusMessage, setStatusMessage] = useState<string>('SCAN COMPLETE • RADAR ONLINE');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [autoScanInterval, setAutoScanInterval] = useState<number>(0); // 0 = off, 3, 5, 10 seconds
  const [activeTab, setActiveTab] = useState<'radar-inspector' | 'list' | 'channels' | 'cooperative' | 'security'>('radar-inspector');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [audioFeedback, setAudioFeedback] = useState<boolean>(false);
  const [calibrationNotice, setCalibrationNotice] = useState<string>('');

  // Audio chirp generator using Web Audio API
  const playRadarChirp = useCallback(() => {
    if (!audioFeedback) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch {
      // Audio context might be blocked by browser policy until interaction
    }
  }, [audioFeedback]);

  // Execute scan function with RF noise fluctuation
  const performScan = useCallback(() => {
    setIsScanning(true);
    setStatusMessage('SCANNING • RADAR ONLINE');
    playRadarChirp();

    setTimeout(() => {
      setResults((prevResults) => {
        const updated = prevResults.map((ap) => {
          // Jitter RSSI with environment noise
          const noise = (Math.random() - 0.48) * currentPreset.environmentNoise * 2;
          const jitteredLevel = Math.max(-98, Math.min(-25, Math.round(ap.level + noise)));
          return {
            ...ap,
            level: jitteredLevel,
            timestamp: Date.now(),
            signalPercent: calculateSignalPercent(jitteredLevel),
          };
        });

        // Update history map for all APs
        setHistory((prevHist) => {
          const nextHist = { ...prevHist };
          updated.forEach((ap) => {
            const h = nextHist[ap.bssid] ? [...nextHist[ap.bssid]] : [];
            if (h.length >= 30) h.shift();
            h.push(ap.level);
            nextHist[ap.bssid] = h;
          });
          return nextHist;
        });

        return updated;
      });

      setIsScanning(false);
      setStatusMessage('SCAN COMPLETE • RADAR UPDATED');
    }, 600);
  }, [currentPreset, playRadarChirp]);

  // Auto-scan timer
  useEffect(() => {
    if (autoScanInterval <= 0) return;
    const timer = setInterval(() => {
      performScan();
    }, autoScanInterval * 1000);
    return () => clearInterval(timer);
  }, [autoScanInterval, performScan]);

  // Switch preset
  const handleSelectPreset = (preset: NetworkEnvironmentPreset) => {
    setCurrentPreset(preset);
    setPathLoss(preset.defaultPathLoss);
    setResults(preset.initialAps);
    const firstBssid = preset.initialAps[0]?.bssid || null;
    setSelectedBssid(firstBssid);

    const newHist: Record<string, number[]> = {};
    preset.initialAps.forEach((ap) => {
      newHist[ap.bssid] = [ap.level - 2, ap.level + 1, ap.level - 1, ap.level];
    });
    setHistory(newHist);
    setStatusMessage(`LOADED PRESET: ${preset.name.toUpperCase()}`);
  };

  // Currently selected AP object
  const selectedAp = useMemo(() => {
    return results.find((r) => r.bssid === selectedBssid) || results[0] || null;
  }, [results, selectedBssid]);

  // Selected AP signal analysis
  const currentAnalysis: SignalAnalysis = useMemo(() => {
    if (!selectedAp) {
      return {
        average: -50,
        stdDev: 0,
        trend: 'INSUFFICIENT DATA',
        estimatedDistance: 1.0,
        confidence: 'LOW',
        referenceRssi,
        pathLoss,
        sampleCount: 0,
      };
    }
    const h = history[selectedAp.bssid] || [selectedAp.level];
    return analyzeSignalHistory(h, selectedAp.level, referenceRssi, pathLoss);
  }, [selectedAp, history, referenceRssi, pathLoss]);

  // 1-Meter Calibration
  const handleCalibrate = () => {
    if (!selectedAp) {
      setStatusMessage('SELECT AN AP FIRST');
      return;
    }
    const h = history[selectedAp.bssid];
    if (!h || h.length === 0) {
      setStatusMessage('NO RSSI SAMPLE');
      return;
    }
    const sum = h.reduce((acc, val) => acc + val, 0);
    const avg = Math.round(sum / h.length);
    setReferenceRssi(avg);
    setStatusMessage('CALIBRATED • SELECTED AP = 1m REFERENCE');
    setCalibrationNotice(`Calibration updated: ${avg} dBm @ 1m for ${selectedAp.ssid}`);
    setTimeout(() => setCalibrationNotice(''), 4000);
  };

  // Add custom AP beacon
  const handleAddAp = (newAp: WifiScanResult) => {
    setResults((prev) => [newAp, ...prev]);
    setHistory((prev) => ({
      ...prev,
      [newAp.bssid]: [newAp.level - 1, newAp.level],
    }));
    setSelectedBssid(newAp.bssid);
    setStatusMessage(`INJECTED BEACON: ${newAp.ssid}`);
  };

  return (
    <div className="min-h-screen bg-[#030604] text-zinc-100 font-mono p-2 sm:p-4 selection:bg-[#00FF66] selection:text-black">
      {/* Top Banner & Header */}
      <header className="max-w-7xl mx-auto mb-3 bg-[#07100D] border border-[#185C38] rounded-xl p-3 sm:p-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#185C38]/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#00FF66] text-xl font-black tracking-wider">
                ◈ WIFI SENTINEL // V1.2
              </span>
              <span className="text-[10px] bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/40 px-2 py-0.5 rounded font-bold">
                TACTICAL RF
              </span>
            </div>
            <div className="text-xs text-[#66FFAA] font-semibold mt-0.5 tracking-wide">
              NETWORK INTELLIGENCE & PASSIVE COOPERATIVE RADAR
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="scanButton"
              onClick={performScan}
              disabled={isScanning}
              className="bg-[#00FF66] hover:bg-[#00e65c] text-[#001a08] font-extrabold px-4 py-2 rounded-lg text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(0,255,102,0.3)] hover:shadow-[0_0_20px_rgba(0,255,102,0.6)] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <span className={isScanning ? 'animate-spin' : ''}>◉</span>
              <span>{isScanning ? 'SCANNING AIRWAVES...' : 'SCAN ACCESS POINTS'}</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#123C2A] hover:bg-[#1b573d] text-[#66FFAA] border border-[#00FF66]/40 hover:border-[#00FF66] px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title="Inject a simulated rogue AP or test beacon"
            >
              + INJECT AP
            </button>

            <button
              onClick={() => setAudioFeedback(!audioFeedback)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                audioFeedback
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-400'
                  : 'bg-[#030604] border-[#185C38] text-zinc-400'
              }`}
              title="Toggle radar sweep audio chirp"
            >
              {audioFeedback ? '🔊 AUDIO ON' : '🔇 AUDIO OFF'}
            </button>
          </div>
        </div>

        {/* Telemetry Status Bar & Environment Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
              <span id="status" className="text-[#66FFAA] font-bold tracking-wide text-xs">
                {statusMessage}
              </span>
            </div>
            <span id="count" className="text-[#00FFFF] font-bold bg-[#00FFFF]/10 px-2 py-0.5 rounded border border-[#00FFFF]/20 text-[11px]">
              {results.length} APs DETECTED
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400 text-[11px]">ENVIRONMENT:</span>
            <select
              value={currentPreset.id}
              onChange={(e) => {
                const found = ENVIRONMENT_PRESETS.find((p) => p.id === e.target.value);
                if (found) handleSelectPreset(found);
              }}
              className="bg-[#030604] border border-[#185C38] text-[#66FFAA] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#00FF66]"
            >
              {ENVIRONMENT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>

            <select
              value={autoScanInterval}
              onChange={(e) => setAutoScanInterval(Number(e.target.value))}
              className="bg-[#030604] border border-[#185C38] text-zinc-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#00FF66]"
              title="Auto-scan rate"
            >
              <option value={0}>AUTO-SCAN: OFF</option>
              <option value={3}>AUTO-SCAN: 3s</option>
              <option value={5}>AUTO-SCAN: 5s</option>
              <option value={10}>AUTO-SCAN: 10s</option>
            </select>
          </div>
        </div>
      </header>

      {/* Navigation View Tabs */}
      <nav className="max-w-7xl mx-auto mb-3 flex flex-wrap gap-1.5 text-xs font-mono">
        <button
          onClick={() => setActiveTab('radar-inspector')}
          className={`px-3.5 py-2 rounded-lg font-bold border transition-colors ${
            activeTab === 'radar-inspector'
              ? 'bg-[#123C2A] text-[#00FF66] border-[#00FF66] shadow-[0_0_10px_rgba(0,255,102,0.2)]'
              : 'bg-[#07100D] text-zinc-400 border-[#185C38] hover:text-zinc-200'
          }`}
        >
          ◉ RADAR & INSPECTOR
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`px-3.5 py-2 rounded-lg font-bold border transition-colors ${
            activeTab === 'list'
              ? 'bg-[#123C2A] text-[#00FF66] border-[#00FF66] shadow-[0_0_10px_rgba(0,255,102,0.2)]'
              : 'bg-[#07100D] text-zinc-400 border-[#185C38] hover:text-zinc-200'
          }`}
        >
          ◈ ACCESS POINT DIRECTORY ({results.length})
        </button>

        <button
          onClick={() => setActiveTab('channels')}
          className={`px-3.5 py-2 rounded-lg font-bold border transition-colors ${
            activeTab === 'channels'
              ? 'bg-[#123C2A] text-[#00FF66] border-[#00FF66] shadow-[0_0_10px_rgba(0,255,102,0.2)]'
              : 'bg-[#07100D] text-zinc-400 border-[#185C38] hover:text-zinc-200'
          }`}
        >
          ☵ CHANNEL SPECTRUM
        </button>

        <button
          onClick={() => setActiveTab('cooperative')}
          className={`px-3.5 py-2 rounded-lg font-bold border transition-colors ${
            activeTab === 'cooperative'
              ? 'bg-[#123C2A] text-[#00FF66] border-[#00FF66] shadow-[0_0_10px_rgba(0,255,102,0.2)]'
              : 'bg-[#07100D] text-zinc-400 border-[#185C38] hover:text-zinc-200'
          }`}
        >
          ❖ COOPERATIVE SENTINEL MESH
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-3.5 py-2 rounded-lg font-bold border transition-colors ${
            activeTab === 'security'
              ? 'bg-[#123C2A] text-[#00FF66] border-[#00FF66] shadow-[0_0_10px_rgba(0,255,102,0.2)]'
              : 'bg-[#07100D] text-zinc-400 border-[#185C38] hover:text-zinc-200'
          }`}
        >
          🛡 SECURITY AUDIT
        </button>
      </nav>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto space-y-4">
        {/* TAB 1: Radar & Inspector */}
        {activeTab === 'radar-inspector' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Radar View (7 Cols on large screen) */}
            <div className="lg:col-span-7 space-y-4">
              <RadarDisplay
                results={results}
                selectedBssid={selectedBssid}
                onSelectAp={(ap) => setSelectedBssid(ap.bssid)}
                referenceRssi={referenceRssi}
                pathLoss={pathLoss}
                isScanning={isScanning}
              />

              {/* Quick Visible AP List below Radar */}
              <div className="bg-[#07100D] border border-[#185C38] rounded-xl p-3.5">
                <div className="flex items-center justify-between text-xs text-[#66FFAA] font-bold mb-2">
                  <span>DETECTED ACCESS POINTS ({results.length})</span>
                  <span className="text-[10px] text-zinc-400">Click row to track</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {results.slice(0, 10).map((ap) => {
                    const isSelected = selectedBssid === ap.bssid;
                    return (
                      <div
                        key={ap.bssid}
                        onClick={() => setSelectedBssid(ap.bssid)}
                        className={`p-2 rounded border transition-all cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-[#123C2A] border-[#00FFFF] text-white'
                            : 'bg-[#030604] border-[#185C38]/60 hover:border-[#00FF66]/50 text-zinc-300'
                        }`}
                      >
                        <div className="font-bold truncate text-white">{ap.ssid || '<hidden SSID>'}</div>
                        <div className="text-[10px] flex items-center justify-between text-[#66FFAA] mt-0.5">
                          <span>{ap.level} dBm • {ap.signalPercent}%</span>
                          <span className="text-[#00FFFF]">CH {ap.channel} • {ap.band}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Inspector View (5 Cols on large screen) */}
            <div className="lg:col-span-5 space-y-4">
              <SelectedApInspector
                ap={selectedAp}
                history={selectedAp ? history[selectedAp.bssid] || [selectedAp.level] : []}
                analysis={currentAnalysis}
                onCalibrate={handleCalibrate}
                onUpdatePathLoss={setPathLoss}
                onUpdateReferenceRssi={setReferenceRssi}
                statusMessage={calibrationNotice}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Full AP Directory */}
        {activeTab === 'list' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8">
              <ApList
                results={results}
                selectedBssid={selectedBssid}
                onSelectAp={(ap) => setSelectedBssid(ap.bssid)}
              />
            </div>
            <div className="lg:col-span-4">
              <SelectedApInspector
                ap={selectedAp}
                history={selectedAp ? history[selectedAp.bssid] || [selectedAp.level] : []}
                analysis={currentAnalysis}
                onCalibrate={handleCalibrate}
                onUpdatePathLoss={setPathLoss}
                onUpdateReferenceRssi={setReferenceRssi}
                statusMessage={calibrationNotice}
              />
            </div>
          </div>
        )}

        {/* TAB 3: Channel Spectrum */}
        {activeTab === 'channels' && (
          <div className="space-y-4">
            <ChannelAnalyzer
              results={results}
              onSelectAp={(ap) => {
                setSelectedBssid(ap.bssid);
                setActiveTab('radar-inspector');
              }}
            />
          </div>
        )}

        {/* TAB 4: Cooperative Sentinel Mesh */}
        {activeTab === 'cooperative' && (
          <div className="space-y-4">
            <CooperativeNodeNetwork currentAp={selectedAp} />
          </div>
        )}

        {/* TAB 5: Security Audit */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <SecurityAuditPanel
              results={results}
              onSelectAp={(ap) => {
                setSelectedBssid(ap.bssid);
                setActiveTab('radar-inspector');
              }}
            />
          </div>
        )}
      </main>

      {/* Add Custom AP Modal */}
      <AddApModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddAp={handleAddAp}
      />
    </div>
  );
}

export default App;
