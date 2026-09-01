export interface WifiScanResult {
  bssid: string;
  ssid: string;
  level: number; // RSSI in dBm (e.g. -45, -72)
  frequency: number; // in MHz (e.g. 2412, 5180, 5975)
  capabilities: string; // e.g. "[WPA2-PSK-CCMP][RSN-PSK-CCMP][ESS]"
  timestamp: number;
  channel: number;
  band: '2.4 GHz' | '5 GHz' | '6 GHz';
  signalPercent: number; // 0-100%
  vendor?: string;
  isCustom?: boolean;
}

export interface SignalAnalysis {
  average: number;
  stdDev: number;
  trend: '↗ IMPROVING' | '↘ WEAKENING' | '→ STABLE' | 'INSUFFICIENT DATA';
  estimatedDistance: number; // in meters
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  referenceRssi: number; // default -45 dBm at 1m
  pathLoss: number; // default 2.0 (free-space/light indoor) to 4.0 (dense walls)
  sampleCount: number;
}

export interface CooperativeNode {
  id: string;
  name: string;
  host: string;
  port: number;
  lastSeen: number;
  rssi: number;
  frequency: number;
  online: boolean;
  locationLabel: string;
  isLocalCoordinator?: boolean;
}

export interface NetworkEnvironmentPreset {
  id: string;
  name: string;
  description: string;
  initialAps: WifiScanResult[];
  environmentNoise: number;
  defaultPathLoss: number;
}
