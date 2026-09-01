import React, { useEffect, useRef, useState, useMemo } from 'react';
import { WifiScanResult } from '../types/wifi';
import { calculateEstimatedDistance, getRssiColor } from '../utils/wifiCalculations';

interface RadarDisplayProps {
  results: WifiScanResult[];
  selectedBssid: string | null;
  onSelectAp: (ap: WifiScanResult) => void;
  referenceRssi: number;
  pathLoss: number;
  isScanning?: boolean;
}

export const RadarDisplay: React.FC<RadarDisplayProps> = ({
  results,
  selectedBssid,
  onSelectAp,
  referenceRssi,
  pathLoss,
  isScanning = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredAp, setHoveredAp] = useState<WifiScanResult | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [sweepSpeedMultiplier, setSweepSpeedMultiplier] = useState(1);

  // Store calculated positions for hit testing
  const blipPositions = useRef<Array<{ x: number; y: number; radius: number; ap: WifiScanResult }>>([]);

  // Compute angle for each AP deterministically from BSSID
  const apAngles = useMemo(() => {
    const map = new Map<string, number>();
    results.forEach((ap, idx) => {
      let hash = 0;
      for (let i = 0; i < ap.bssid.length; i++) {
        hash = (hash * 31 + ap.bssid.charCodeAt(i)) % 1000;
      }
      // Golden ratio angle dispersion to prevent overlapping
      const angle = (idx * 2.399963 + (hash % 100) * 0.02) % (Math.PI * 2);
      map.set(ap.bssid, angle);
    });
    return map;
  }, [results]);

  useEffect(() => {
    let animationFrameId: number;
    let sweepAngle = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = Math.max(340, Math.min(width, 420)));

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = Math.max(340, Math.min(width, 420));
    };

    window.addEventListener('resize', handleResize);

    const render = () => {
      // Clear with dark tactical background
      ctx.fillStyle = '#030604';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.min(cx, cy) - 24;

      // 1. Radar Grid - Concentric circles
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#185C38';

      // Concentric range rings
      const rings = [0.33, 0.66, 1.0];
      const ringDistances = ['5m', '15m', '30m+'];

      rings.forEach((ratio, idx) => {
        const r = maxRadius * ratio;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Distance label on the ring
        ctx.fillStyle = '#227b4b';
        ctx.font = '10px monospace';
        ctx.fillText(ringDistances[idx], cx + 4, cy - r + 12);
      });

      // Crosshairs & Diagonal grids
      ctx.beginPath();
      ctx.moveTo(cx - maxRadius, cy);
      ctx.lineTo(cx + maxRadius, cy);
      ctx.moveTo(cx, cy - maxRadius);
      ctx.lineTo(cx, cy + maxRadius);
      ctx.stroke();

      // Cardinal points
      ctx.fillStyle = '#00FF66';
      ctx.font = '10px monospace';
      ctx.fillText('N (0°)', cx - 14, cy - maxRadius - 6);
      ctx.fillText('S (180°)', cx - 18, cy + maxRadius + 14);
      ctx.fillText('E (90°)', cx + maxRadius + 6, cy + 3);
      ctx.fillText('W (270°)', cx - maxRadius - 44, cy + 3);

      // 2. Rotating Radar Sweep Beam & phosphor trail
      sweepAngle += 0.03 * sweepSpeedMultiplier;
      if (sweepAngle > Math.PI * 2) sweepAngle -= Math.PI * 2;

      // Draw fading sweep wedge
      const sweepArc = 0.35; // ~20 degrees
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
      gradient.addColorStop(0, 'rgba(0, 255, 102, 0.3)');
      gradient.addColorStop(0.8, 'rgba(0, 255, 102, 0.15)');
      gradient.addColorStop(1, 'rgba(0, 255, 102, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxRadius, sweepAngle - sweepArc, sweepAngle, false);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Main sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(sweepAngle) * maxRadius,
        cy + Math.sin(sweepAngle) * maxRadius
      );
      ctx.strokeStyle = '#00FF88';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00FF88';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();

      // 3. Central Local Sentinel Beacon (observer)
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#00FF66';
      ctx.shadowColor = '#00FF66';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Pulse ring for local observer
      const pulseRadius = (Date.now() % 2000) / 2000;
      ctx.beginPath();
      ctx.arc(cx, cy, 5 + pulseRadius * 20, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 102, ${1 - pulseRadius})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Draw AP Targets (Blips)
      const currentBlips: Array<{ x: number; y: number; radius: number; ap: WifiScanResult }> = [];

      results.forEach((ap) => {
        const angle = apAngles.get(ap.bssid) || 0;
        // Map RSSI (-30 to -95 dBm) to radial distance (closer = stronger)
        const strength = Math.max(0, Math.min(1, (ap.level + 100) / 65));
        const distRatio = 0.2 + 0.75 * (1 - strength);
        const r = maxRadius * distRatio;

        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        const isSelected = selectedBssid === ap.bssid;
        const isHovered = hoveredAp?.bssid === ap.bssid;
        const blipRadius = isSelected ? 8 : isHovered ? 7 : Math.max(4, Math.min(8, 4 + strength * 4));

        currentBlips.push({ x, y, radius: Math.max(12, blipRadius + 4), ap });

        // Calculate angle delta to sweep line to create illuminated phosphorescence
        let angleDiff = sweepAngle - angle;
        while (angleDiff < 0) angleDiff += Math.PI * 2;
        while (angleDiff >= Math.PI * 2) angleDiff -= Math.PI * 2;
        const justSwept = angleDiff < 0.6;

        ctx.save();

        // Outer glow/ring for selected or freshly swept AP
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, blipRadius + 6, 0, Math.PI * 2);
          ctx.strokeStyle = '#00FFFF';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Selection crosshair
          ctx.beginPath();
          ctx.moveTo(x - blipRadius - 8, y);
          ctx.lineTo(x + blipRadius + 8, y);
          ctx.moveTo(x, y - blipRadius - 8);
          ctx.lineTo(x, y + blipRadius + 8);
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        if (justSwept || isHovered) {
          ctx.beginPath();
          ctx.arc(x, y, blipRadius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(102, 255, 170, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Blip core
        ctx.beginPath();
        ctx.arc(x, y, blipRadius, 0, Math.PI * 2);

        // Color according to band / status
        if (isSelected) {
          ctx.fillStyle = '#00FFFF';
          ctx.shadowColor = '#00FFFF';
          ctx.shadowBlur = 12;
        } else if (ap.band === '6 GHz') {
          ctx.fillStyle = '#A78BFA'; // Purple for 6GHz
          ctx.shadowColor = '#A78BFA';
          ctx.shadowBlur = justSwept ? 8 : 4;
        } else if (ap.band === '5 GHz') {
          ctx.fillStyle = '#38BDF8'; // Blue for 5GHz
          ctx.shadowColor = '#38BDF8';
          ctx.shadowBlur = justSwept ? 8 : 4;
        } else {
          ctx.fillStyle = '#4ADE80'; // Green for 2.4GHz
          ctx.shadowColor = '#4ADE80';
          ctx.shadowBlur = justSwept ? 8 : 4;
        }

        ctx.fill();
        ctx.shadowBlur = 0;

        // Label text if enabled
        if (showLabels || isSelected || isHovered) {
          ctx.fillStyle = isSelected ? '#00FFFF' : isHovered ? '#FFFFFF' : '#A7F3D0';
          ctx.font = isSelected ? 'bold 11px monospace' : '9px monospace';
          const label = ap.ssid.length > 14 ? ap.ssid.slice(0, 12) + '…' : ap.ssid;
          ctx.fillText(`${label} (${ap.level}dBm)`, x + blipRadius + 4, y + 3);
        }

        ctx.restore();
      });

      blipPositions.current = currentBlips;
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [results, selectedBssid, hoveredAp, showLabels, sweepSpeedMultiplier, apAngles, referenceRssi, pathLoss]);

  // Handle canvas mouse move for tooltips and hover
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // Check hit test
    const hit = blipPositions.current.find((b) => {
      const dx = b.x - x;
      const dy = b.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= b.radius;
    });

    setHoveredAp(hit ? hit.ap : null);
  };

  const handleMouseLeave = () => {
    setHoveredAp(null);
    setMousePos(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hit = blipPositions.current.find((b) => {
      const dx = b.x - x;
      const dy = b.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= b.radius;
    });

    if (hit) {
      onSelectAp(hit.ap);
    }
  };

  return (
    <div
      ref={containerRef}
      id="radar-container"
      className="relative flex flex-col items-center bg-[#030604] border border-[#185C38]/60 rounded-xl p-3 shadow-inner overflow-hidden"
    >
      {/* Radar HUD Header Info */}
      <div className="w-full flex items-center justify-between text-xs font-mono text-[#66FFAA] px-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#00FF66] animate-pulse"></span>
          <span className="font-semibold tracking-wider">RADAR SCOPE 360°</span>
          {isScanning && (
            <span className="text-[#00FFFF] bg-[#00FFFF]/10 px-1.5 py-0.5 rounded border border-[#00FFFF]/30 animate-pulse text-[10px]">
              SWEEPING
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          <label className="flex items-center gap-1 cursor-pointer hover:text-[#66FFAA]">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="accent-[#00FF66] rounded scale-90"
            />
            <span>Labels</span>
          </label>
          <button
            onClick={() => setSweepSpeedMultiplier((prev) => (prev === 1 ? 1.8 : prev === 1.8 ? 0.5 : 1))}
            className="px-2 py-0.5 rounded bg-[#07100D] border border-[#185C38] text-[#66FFAA] hover:bg-[#123C2A] text-[10px]"
            title="Toggle Sweep Speed"
          >
            {sweepSpeedMultiplier === 1 ? '1x' : sweepSpeedMultiplier === 1.8 ? '1.8x' : '0.5x'} Speed
          </button>
        </div>
      </div>

      {/* Radar Canvas */}
      <div className="relative w-full flex justify-center items-center">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="cursor-crosshair rounded-lg max-w-full"
        />

        {/* Hover Tooltip Overlay */}
        {hoveredAp && mousePos && (
          <div
            className="absolute z-20 pointer-events-none bg-[#07100D]/95 border border-[#00FF66] text-[#66FFAA] p-2.5 rounded-lg shadow-xl text-xs font-mono backdrop-blur-sm"
            style={{
              left: Math.min(mousePos.x + 12, (canvasRef.current?.width || 300) - 180),
              top: Math.max(10, mousePos.y - 60),
            }}
          >
            <div className="font-bold text-white text-[13px]">{hoveredAp.ssid}</div>
            <div className="text-zinc-400 text-[10px]">{hoveredAp.bssid}</div>
            <div className="mt-1 flex items-center justify-between gap-4 text-[11px]">
              <span className="text-[#00FFFF]">RSSI: {hoveredAp.level} dBm</span>
              <span className="text-emerald-400">{hoveredAp.signalPercent}%</span>
            </div>
            <div className="text-[10px] text-zinc-300 mt-0.5">
              CH {hoveredAp.channel} • {hoveredAp.band} • ~{calculateEstimatedDistance(hoveredAp.level, referenceRssi, pathLoss).toFixed(1)}m
            </div>
          </div>
        )}
      </div>

      {/* Legend below Radar */}
      <div className="w-full flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-400 px-2 pt-2 border-t border-[#185C38]/40 mt-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#4ADE80]"></span> 2.4 GHz
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8]"></span> 5 GHz
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#A78BFA]"></span> 6 GHz
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-[#00FFFF] bg-cyan-400"></span> Selected
          </span>
        </div>
        <div className="text-[#66FFAA] text-[10px]">
          Target: {results.length} APs Online
        </div>
      </div>
    </div>
  );
};
