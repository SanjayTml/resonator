import React, { useRef } from "react";
import {
  Play,
  Pause,
  Mic,
  Monitor,
  Music,
  Upload,
  Volume2,
} from "lucide-react";
import { AudioSourceType } from "../../types";
import { Button, IconButton, Slider } from "../ui/primitives";

interface WorkspaceFooterProps {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  trackTitle: string;
  sourceType: AudioSourceType;
  setSourceType: (type: AudioSourceType) => void;
  volume: number;
  setVolume: (v: number) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTabShare: () => void;
}

const WorkspaceFooter: React.FC<WorkspaceFooterProps> = ({
  isPlaying,
  setIsPlaying,
  trackTitle,
  sourceType,
  setSourceType,
  volume,
  setVolume,
  onFileUpload,
  onTabShare,
}) => {
  const fileImportRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl p-2 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsPlaying(!isPlaying)}
            size="sm"
            variant="primary"
            iconOnly
            className="w-10 h-10 rounded-full"
            aria-label={isPlaying ? "Pause playback" : "Play"}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="ml-0.5" />
            )}
          </Button>
          <div className="flex flex-col ml-1">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 max-w-[150px] truncate">
              {trackTitle}
            </span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {sourceType}
            </span>
          </div>
        </div>

        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/50 rounded-xl p-1">
          <IconButton
            onClick={() => setSourceType(AudioSourceType.MICROPHONE)}
            active={sourceType === AudioSourceType.MICROPHONE}
            title="Microphone"
            aria-label="Use microphone"
          >
            <Mic size={16} />
          </IconButton>
          <IconButton
            onClick={onTabShare}
            active={sourceType === AudioSourceType.TAB}
            title="Tab Audio"
            aria-label="Share tab audio"
          >
            <Monitor size={16} />
          </IconButton>
          <IconButton
            onClick={() => fileImportRef.current?.click()}
            active={sourceType === AudioSourceType.FILE}
            title="Upload File"
            aria-label="Upload audio file"
          >
            <Upload size={16} />
          </IconButton>
          <IconButton
            onClick={() => setSourceType(AudioSourceType.OSCILLATOR)}
            active={sourceType === AudioSourceType.OSCILLATOR}
            title="Demo"
            aria-label="Use demo tone"
          >
            <Music size={16} />
          </IconButton>
          <input
            ref={fileImportRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={onFileUpload}
          />
        </div>

        <div className="flex items-center gap-2">
          <Volume2 size={16} className="text-zinc-400" />
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
};

export default WorkspaceFooter;
