import { WifiScanResult, SignalAnalysis } from '../types/wifi';

export function calculateChannel(frequency: number): number {
  if (frequency >= 2412 && frequency <= 2484) {
    return frequency === 2484 ? 14 : Math.floor((frequency - 2407) / 5);
  }
  if (frequency >= 5000 && frequency < 5925) {
    return Math.floor((frequency - 5000) / 5);
  }
  if (frequency >= 5925) {
    return Math.floor((frequency - 5950) / 5) + 1;
  }
  return 0;
}

export function calculateBand(frequency: number): '2.4 GHz' | '5 GHz' | '6 GHz' {
  if (frequency >= 5925) return '6 GHz';
  if (frequency >= 4900) return '5 GHz';
  return '2.4 GHz';
}

export function calculateSignalPercent(rssi: number): number {
  return Math.max(0, Math.min(100, Math.round(((rssi + 100) * 100) / 60)));
}

export function calculateEstimatedDistance(rssi: number, referenceRssi: number = -45, pathLoss: number = 2.0): number {
  const dist = Math.pow(10, (referenceRssi - rssi) / (10 * pathLoss));
  return Math.max(0.1, Math.min(999.9, dist));
}

export function analyzeSignalHistory(
  history: number[],
  currentLevel: number,
  referenceRssi: number = -45,
  pathLoss: number = 2.0
): SignalAnalysis {
  if (!history || history.length === 0) {
    return {
      average: currentLevel,
      stdDev: 0,
      trend: 'INSUFFICIENT DATA',
      estimatedDistance: calculateEstimatedDistance(currentLevel, referenceRssi, pathLoss),
      confidence: 'LOW',
      referenceRssi,
      pathLoss,
      sampleCount: 1,
    };
  }

  const sum = history.reduce((acc, val) => acc + val, 0);
  const average = sum / history.length;

  let varianceSum = 0;
  for (const val of history) {
    varianceSum += Math.pow(val - average, 2);
  }
  const stdDev = history.length > 1 ? Math.sqrt(varianceSum / history.length) : 0;

  let trend: SignalAnalysis['trend'] = 'INSUFFICIENT DATA';
  if (history.length >= 3) {
    const latest = history[history.length - 1];
    const prev = history[Math.max(0, history.length - 4)];
    const delta = latest - prev;
    if (delta > 2) trend = '↗ IMPROVING';
    else if (delta < -2) trend = '↘ WEAKENING';
    else trend = '→ STABLE';
  }

  let confidence: SignalAnalysis['confidence'] = 'LOW';
  if (history.length >= 5) {
    if (stdDev <= 2.5) confidence = 'HIGH';
    else if (stdDev <= 5.0) confidence = 'MEDIUM';
    else confidence = 'LOW';
  }

  const estimatedDistance = calculateEstimatedDistance(currentLevel, referenceRssi, pathLoss);

  return {
    average: Math.round(average * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    trend,
    estimatedDistance: Math.round(estimatedDistance * 10) / 10,
    confidence,
    referenceRssi,
    pathLoss,
    sampleCount: history.length,
  };
}

export function getSecurityBadge(capabilities: string): { label: string; color: string; isSecure: boolean; isWpa3: boolean } {
  const cap = capabilities.toUpperCase();
  if (cap.includes('WPA3') || cap.includes('SAE')) {
    return { label: 'WPA3 Enterprise/SAE', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30', isSecure: true, isWpa3: true };
  }
  if (cap.includes('WPA2') || cap.includes('RSN')) {
    return { label: 'WPA2-PSK (AES)', color: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30', isSecure: true, isWpa3: false };
  }
  if (cap.includes('WPA')) {
    return { label: 'WPA Legacy (TKIP)', color: 'text-amber-400 bg-amber-950/60 border-amber-500/30', isSecure: false, isWpa3: false };
  }
  if (cap.includes('WEP')) {
    return { label: 'WEP (Deprecated/Insecure)', color: 'text-rose-400 bg-rose-950/60 border-rose-500/30', isSecure: false, isWpa3: false };
  }
  return { label: 'OPEN / UNENCRYPTED', color: 'text-red-400 bg-red-950/70 border-red-500/50', isSecure: false, isWpa3: false };
}

export function getRssiColor(rssi: number): { text: string; bg: string; bar: string; label: string } {
  if (rssi >= -55) {
    return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/40', bar: 'bg-emerald-400', label: 'EXCELLENT' };
  }
  if (rssi >= -67) {
    return { text: 'text-teal-300', bg: 'bg-teal-500/10 border-teal-500/40', bar: 'bg-teal-400', label: 'GOOD' };
  }
  if (rssi >= -75) {
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/40', bar: 'bg-yellow-400', label: 'FAIR' };
  }
  if (rssi >= -85) {
    return { text: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/40', bar: 'bg-orange-400', label: 'WEAK' };
  }
  return { text: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/40', bar: 'bg-rose-500', label: 'POOR' };
}
