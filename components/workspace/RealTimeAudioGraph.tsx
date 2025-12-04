import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChartNoAxesColumn } from "lucide-react";

interface RealTimeAudioGraphProps {
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  isPlaying: boolean;
  graphEnabled: boolean;
}

const MAX_FREQUENCY = 22000;
const FREQUENCY_STEP = 200;
const DB_MAX = 150;
const DB_STEP = 10;
const BAR_COUNT = Math.ceil(MAX_FREQUENCY / FREQUENCY_STEP);
const RISE_SMOOTH = 0.6;
const FALL_SMOOTH = 0.35;

const DB_TICKS = Array.from({ length: DB_MAX / DB_STEP + 1 }, (_, i) => i * DB_STEP);
const FREQ_LABELS = [0, 5000, 10000, 15000, 20000, 22000];

const RealTimeAudioGraph: React.FC<RealTimeAudioGraphProps> = ({
  analyserRef,
  isPlaying,
  graphEnabled,
}) => {
  const [levels, setLevels] = useState<number[]>(
    () => new Array(BAR_COUNT).fill(0)
  );
  const rafRef = useRef<number>();
  const freqDataRef = useRef<Uint8Array | null>(null);

  const gridStyle = useMemo(() => {
    const verticalStep = `${100 / BAR_COUNT}%`;
    const horizontalStep = `${100 / (DB_MAX / DB_STEP)}%`;
    return {
      backgroundImage:
        "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to top, rgba(255,255,255,0.08) 1px, transparent 1px)",
      backgroundSize: `${verticalStep} 100%, 100% ${horizontalStep}`,
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || !graphEnabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setLevels((prev) => prev.map(() => 0));
      return;
    }

    let mounted = true;
    const animate = () => {
      if (!mounted) return;
      const analyser = analyserRef.current;
      if (!analyser || analyser.frequencyBinCount === 0) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      if (
        !freqDataRef.current ||
        freqDataRef.current.length !== analyser.frequencyBinCount
      ) {
        freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      }

      const freqData = freqDataRef.current;
      analyser.getByteFrequencyData(freqData);

      const freqPerBin = analyser.context.sampleRate / analyser.fftSize;
      const aggregates = new Array(BAR_COUNT).fill(0);
      const counts = new Array(BAR_COUNT).fill(0);

      for (let i = 0; i < freqData.length; i++) {
        const freq = i * freqPerBin;
        if (freq > MAX_FREQUENCY) break;
        const index = Math.min(
          BAR_COUNT - 1,
          Math.floor(freq / FREQUENCY_STEP)
        );
        aggregates[index] += freqData[i];
        counts[index]++;
      }

      const nextLevels = aggregates.map((value, idx) => {
        const avg = counts[idx] > 0 ? value / counts[idx] : value;
        return Math.min(DB_MAX, (avg / 255) * DB_MAX);
      });
      setLevels((prevLevels) =>
        prevLevels.map((prev, idx) => {
          const target = nextLevels[idx];
          const smooth = target > prev ? RISE_SMOOTH : FALL_SMOOTH;
          return prev + (target - prev) * smooth;
        })
      );
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyserRef, isPlaying, graphEnabled]);

  return (
    <div className="relative h-36 rounded-xl overflow-hidden bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800">
      <div className="absolute inset-0" style={gridStyle} />
      <div className="absolute top-3 left-8 right-3 bottom-8 flex items-end gap-px">
        {levels.map((level, idx) => (
          <div
            key={idx}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-blue-500 via-sky-400 to-cyan-300 transition-[height] duration-50 ease-linear"
            style={{ height: `${(level / DB_MAX) * 100}%` }}
          />
        ))}
      </div>

      {/* Indicator */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-2">
        <span
          className={`inline-flex h-2.5 w-2.5 rounded-full shadow-[0_0_6px] ${
            isPlaying && graphEnabled
              ? "bg-emerald-400 shadow-emerald-400/80 animate-pulse"
              : "bg-zinc-500 shadow-transparent"
          }`}
          aria-hidden
        />
      </div>

      {/* dB ticks */}
      <div className="absolute left-2 top-3 bottom-8 pointer-events-none">
        {DB_TICKS.map((value) => (
          <div
            key={value}
            className="absolute text-[9px] text-zinc-500"
            style={{ bottom: `calc(${(value / DB_MAX) * 100}% - 6px)` }}
          >
            {value}
          </div>
        ))}
      </div>

      {/* Axis titles */}
      <div className="absolute top-1.5 left-6 text-[9px] uppercase tracking-wide text-zinc-400 pointer-events-none">
        dB
      </div>
      <div className="absolute bottom-1 right-3 text-[9px] uppercase tracking-wide text-zinc-400 pointer-events-none">
        Hz
      </div>

      {/* Frequency labels */}
      <div className="absolute bottom-3.5 left-8 right-3 pointer-events-none flex justify-between text-[9px] text-zinc-500">
        {FREQ_LABELS.map((value) => (
          <span key={value}>
            {value >= 1000 ? `${value / 1000}k` : value}
          </span>
        ))}
      </div>

      {!graphEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 text-[11px] uppercase tracking-wide text-zinc-300">
          Graph Disabled
        </div>
      )}
    </div>
  );
};

export default RealTimeAudioGraph;
