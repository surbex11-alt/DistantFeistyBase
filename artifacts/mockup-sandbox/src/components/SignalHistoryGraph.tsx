import React, { useRef, useEffect } from 'react';
import { getRssiColor } from '../utils/wifiCalculations';

interface SignalHistoryGraphProps {
  history: number[];
  bssid: string;
  ssid: string;
  referenceRssi: number;
}

export const SignalHistoryGraph: React.FC<SignalHistoryGraphProps> = ({
  history,
  bssid,
  ssid,
  referenceRssi,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 320);
    const height = (canvas.height = 110);

    // Dark tactical background
    ctx.fillStyle = '#07100D';
    ctx.fillRect(0, 0, width, height);

    // Padding
    const padTop = 14;
    const padBottom = 20;
    const padLeft = 36;
    const padRight = 14;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Y scale range: -100 dBm (bottom) to -20 dBm (top)
    const minRssi = -100;
    const maxRssi = -20;
    const rssiRange = maxRssi - minRssi;

    const getY = (rssi: number) => {
      const clamped = Math.max(minRssi, Math.min(maxRssi, rssi));
      return padTop + plotH - ((clamped - minRssi) / rssiRange) * plotH;
    };

    // Draw horizontal grid lines & labels
    const gridLevels = [-30, -50, -70, -90];
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#122E21';
    ctx.fillStyle = '#447A5D';
    ctx.font = '9px monospace';

    gridLevels.forEach((level) => {
      const y = getY(level);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.fillText(`${level}`, 6, y + 3);
    });

    // Draw reference RSSI marker line (calibration 1m reference)
    if (referenceRssi >= minRssi && referenceRssi <= maxRssi) {
      const refY = getY(referenceRssi);
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padLeft, refY);
      ctx.lineTo(width - padRight, refY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#00FFFF';
      ctx.fillText(`1m REF`, width - padRight - 38, refY - 3);
    }

    if (!history || history.length < 1) {
      ctx.fillStyle = '#447A5D';
      ctx.font = '11px monospace';
      ctx.fillText('COLLECTING RSSI SAMPLES...', padLeft + 20, height / 2);
      return;
    }

    // Draw filled area under curve
    const points: Array<{ x: number; y: number }> = [];
    const maxSamples = Math.max(30, history.length);

    history.forEach((val, i) => {
      const x = padLeft + (i / (Math.max(1, history.length - 1))) * plotW;
      const y = getY(val);
      points.push({ x, y });
    });

    if (points.length > 1) {
      // Area gradient
      const gradient = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
      gradient.addColorStop(0, 'rgba(102, 255, 170, 0.35)');
      gradient.addColorStop(1, 'rgba(102, 255, 170, 0.02)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, height - padBottom);
      points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.lineTo(points[points.length - 1].x, height - padBottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Main signal stroke line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = '#66FFAA';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#66FFAA';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw point markers
      points.forEach((p, idx) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, idx === points.length - 1 ? 4 : 2, 0, Math.PI * 2);
        ctx.fillStyle = idx === points.length - 1 ? '#00FFFF' : '#66FFAA';
        ctx.fill();
      });

      // Latest value callout
      const latestPoint = points[points.length - 1];
      const latestVal = history[history.length - 1];
      ctx.fillStyle = '#00FFFF';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`${latestVal} dBm`, Math.max(padLeft, latestPoint.x - 30), Math.max(12, latestPoint.y - 6));
    } else if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#66FFAA';
      ctx.fill();
    }

    // X-axis label
    ctx.fillStyle = '#37624B';
    ctx.font = '9px monospace';
    ctx.fillText('PAST 30 SAMPLES (ROLLING RF WINDOW)', padLeft + 10, height - 6);
  }, [history, bssid, referenceRssi]);

  const latestVal = history.length > 0 ? history[history.length - 1] : 0;
  const rssiColor = getRssiColor(latestVal);

  return (
    <div className="w-full bg-[#07100D] border border-[#185C38]/80 rounded-lg p-2.5 font-mono">
      <div className="flex items-center justify-between text-xs mb-1.5 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#66FFAA] animate-pulse"></span>
          <span className="text-[#66FFAA] font-semibold text-[11px]">SIGNAL WAVEFORM</span>
        </div>
        <span className={`text-[11px] font-bold ${rssiColor.text}`}>
          {latestVal} dBm ({history.length} samples)
        </span>
      </div>

      <div className="w-full overflow-hidden rounded">
        <canvas ref={canvasRef} className="w-full block" />
      </div>
    </div>
  );
};
