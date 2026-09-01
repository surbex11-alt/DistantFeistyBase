import React, { useState, useEffect } from 'react';
import { CooperativeNode, WifiScanResult } from '../types/wifi';

interface CooperativeNodeNetworkProps {
  currentAp: WifiScanResult | null;
  onSelectNodeMeasurement?: (rssi: number) => void;
}

export const CooperativeNodeNetwork: React.FC<CooperativeNodeNetworkProps> = ({
  currentAp,
}) => {
  const [localNodeId] = useState<string>(() => 'sentinel-' + Math.random().toString(36).substring(2, 10));
  const [serverPort, setServerPort] = useState<number>(8080);
  const [isServerRunning, setIsServerRunning] = useState<boolean>(true);
  const [discoverySubnet, setDiscoverySubnet] = useState<string>('192.168.1.0/24');
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [measurementLogs, setMeasurementLogs] = useState<Array<{ id: string; time: string; from: string; payload: string }>>([]);

  const [nodes, setNodes] = useState<CooperativeNode[]>([
    {
      id: 'node-alpha-lobby',
      name: 'Sentinel Alpha (Lobby Entrance)',
      host: '192.168.1.42',
      port: 8080,
      lastSeen: Date.now() - 3000,
      rssi: -48,
      frequency: 5180,
      online: true,
      locationLabel: 'Ground Floor, Lobby West',
    },
    {
      id: 'node-beta-server',
      name: 'Sentinel Beta (Datacenter A)',
      host: '192.168.1.108',
      port: 8080,
      lastSeen: Date.now() - 6000,
      rssi: -38,
      frequency: 5975,
      online: true,
      locationLabel: 'B1 Server Room Rack 04',
    },
    {
      id: 'node-gamma-exec',
      name: 'Sentinel Gamma (Executive 4F)',
      host: '192.168.1.215',
      port: 8080,
      lastSeen: Date.now() - 45000,
      rssi: -72,
      frequency: 2437,
      online: false,
      locationLabel: 'Floor 4, Conference Suite',
    },
  ]);

  // Simulated background server receiver & node beacon stream
  useEffect(() => {
    if (!isServerRunning) return;

    const interval = setInterval(() => {
      // Pick a random online node to transmit telemetry
      const onlineNodes = nodes.filter((n) => n.online);
      if (onlineNodes.length === 0) return;

      const randomNode = onlineNodes[Math.floor(Math.random() * onlineNodes.length)];
      const jitterRssi = randomNode.rssi + Math.floor(Math.random() * 5 - 2);
      const payload = JSON.stringify({
        nodeId: randomNode.id,
        timestamp: Date.now(),
        rssi: jitterRssi,
        frequency: randomNode.frequency,
        targetBssid: currentAp?.bssid || '74:83:C2:11:9A:01',
      });

      // Update node last seen & RSSI
      setNodes((prev) =>
        prev.map((n) =>
          n.id === randomNode.id ? { ...n, lastSeen: Date.now(), rssi: jitterRssi } : n
        )
      );

      // Append to measurement log
      setMeasurementLogs((prev) => [
        {
          id: Math.random().toString(36).substring(2, 9),
          time: new Date().toLocaleTimeString(),
          from: `${randomNode.name} (${randomNode.host})`,
          payload,
        },
        ...prev.slice(0, 19),
      ]);
    }, 4000);

    return () => clearInterval(interval);
  }, [isServerRunning, nodes, currentAp]);

  // Run subnet probe
  const handleProbeSubnet = () => {
    setIsProbing(true);
    setTimeout(() => {
      setIsProbing(false);
      // Revive or discover a new sentinel node
      const newId = 'node-delta-' + Math.floor(Math.random() * 900 + 100);
      const newHost = '192.168.1.' + Math.floor(Math.random() * 200 + 20);
      const newNode: CooperativeNode = {
        id: newId,
        name: `Sentinel Node (${newHost})`,
        host: newHost,
        port: 8080,
        lastSeen: Date.now(),
        rssi: Math.floor(Math.random() * 30 - 75),
        frequency: 5180,
        online: true,
        locationLabel: 'Auto-discovered Subnet Host',
      };

      setNodes((prev) => [newNode, ...prev]);
    }, 1500);
  };

  // Send test measurement to coordinator
  const handleSendTestMeasurement = (targetHost: string) => {
    const payload = JSON.stringify({
      nodeId: localNodeId,
      timestamp: Date.now(),
      rssi: currentAp ? currentAp.level : -50,
      frequency: currentAp ? currentAp.frequency : 5180,
    });

    setMeasurementLogs((prev) => [
      {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        from: `Local Node -> ${targetHost}:8080`,
        payload: `[CLIENT SEND OK] ${payload}`,
      },
      ...prev.slice(0, 19),
    ]);
  };

  return (
    <div className="bg-[#07100D] border border-[#185C38] rounded-xl p-4 font-mono text-zinc-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#185C38]/60 pb-3 mb-3">
        <div>
          <div className="text-[11px] text-[#00FFFF] font-bold tracking-wider">COOPERATIVE SENSING MESH</div>
          <h3 className="text-sm font-bold text-white">Distributed Sentinel Coordinator & Node Registry</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsServerRunning(!isServerRunning)}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
              isServerRunning
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-400'
                : 'bg-rose-950/70 border-rose-500/50 text-rose-400'
            }`}
          >
            {isServerRunning ? '● SERVER LISTENING :8080' : '○ SERVER OFFLINE'}
          </button>
        </div>
      </div>

      {/* Local Node Identity Banner */}
      <div className="bg-[#030604] border border-[#185C38]/70 rounded-lg p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <div className="text-[10px] text-zinc-400">LOCAL OBSERVER NODE ID</div>
          <div className="text-[#66FFAA] font-bold text-xs">{localNodeId}</div>
          <div className="text-[10px] text-zinc-500">Autonomous RF Sensing Endpoint (LAN-Only / Passive)</div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={discoverySubnet}
            onChange={(e) => setDiscoverySubnet(e.target.value)}
            placeholder="Subnet CIDR"
            className="bg-[#07100D] border border-[#185C38] px-2 py-1 rounded text-xs text-white w-32 focus:outline-none focus:border-[#00FF66]"
          />
          <button
            onClick={handleProbeSubnet}
            disabled={isProbing}
            className="bg-[#123C2A] hover:bg-[#1b573d] text-[#66FFAA] px-3 py-1 rounded border border-[#00FF66]/30 text-xs font-bold transition-colors disabled:opacity-50"
          >
            {isProbing ? 'PROBING...' : '⚡ PROBE SUBNET'}
          </button>
        </div>
      </div>

      {/* Active Remote Sentinel Nodes */}
      <div className="mb-4">
        <div className="text-xs text-[#00FFFF] font-bold mb-2 flex items-center justify-between">
          <span>COOPERATING SENTINEL SENSORS ({nodes.filter((n) => n.online).length} ONLINE)</span>
          <span className="text-[10px] text-zinc-400">Auto-refresh: 4s</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {nodes.map((node) => {
            const isStale = Date.now() - node.lastSeen > 30000;
            return (
              <div
                key={node.id}
                className={`bg-[#030604] border rounded-lg p-3 transition-colors ${
                  node.online && !isStale
                    ? 'border-[#185C38] hover:border-[#00FF66]/50'
                    : 'border-zinc-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="font-bold text-xs text-white truncate max-w-[170px]">{node.name}</div>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      node.online && !isStale ? 'bg-[#00FF66] animate-pulse' : 'bg-zinc-600'
                    }`}
                  />
                </div>

                <div className="text-[10px] text-zinc-400 mt-1">{node.locationLabel}</div>
                <div className="text-[10px] text-zinc-500">{node.host}:{node.port}</div>

                <div className="mt-2.5 flex items-center justify-between text-xs border-t border-zinc-800 pt-2">
                  <span className="text-[#66FFAA] font-bold">{node.rssi} dBm</span>
                  <span className="text-zinc-400 text-[10px]">
                    {Math.round((Date.now() - node.lastSeen) / 1000)}s ago
                  </span>
                </div>

                <div className="mt-2">
                  <button
                    onClick={() => handleSendTestMeasurement(node.host)}
                    className="w-full text-[10px] py-1 rounded bg-[#07100D] hover:bg-[#123C2A] text-zinc-300 hover:text-[#66FFAA] border border-[#185C38] transition-colors"
                  >
                    SEND TELEMETRY PACKET
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Measurement Telemetry Log Feed */}
      <div>
        <div className="text-xs text-[#66FFAA] font-bold mb-1.5 flex items-center justify-between">
          <span>MEASUREMENT PACKET STREAM</span>
          <button
            onClick={() => setMeasurementLogs([])}
            className="text-[10px] text-zinc-500 hover:text-zinc-300"
          >
            Clear Log
          </button>
        </div>

        <div className="bg-[#030604] border border-[#185C38]/60 rounded-lg p-2.5 max-h-36 overflow-y-auto font-mono text-[11px] space-y-1">
          {measurementLogs.length === 0 ? (
            <div className="text-zinc-600 italic text-center py-2">
              Awaiting cooperative telemetry packets...
            </div>
          ) : (
            measurementLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-zinc-300 border-b border-zinc-900 pb-1">
                <span className="text-zinc-500 text-[10px] shrink-0">[{log.time}]</span>
                <span className="text-[#00FFFF] text-[10px] shrink-0">{log.from}:</span>
                <span className="text-[#66FFAA] text-[10px] break-all">{log.payload}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
