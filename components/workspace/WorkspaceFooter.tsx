
import React, { useRef } from 'react';
import { 
  Play, Pause, Mic, Monitor, Music, Upload, Volume2 
} from 'lucide-react';
import { AudioSourceType } from '../../types';

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
  isPlaying, setIsPlaying, trackTitle, sourceType, setSourceType, 
  volume, setVolume, onFileUpload, onTabShare 
}) => {
  const fileImportRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl p-2 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center hover:scale-105 transition-transform shadow-sm">
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                </button>
                <div className="flex flex-col ml-1">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 max-w-[150px] truncate">{trackTitle}</span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{sourceType}</span>
                </div>
            </div>

            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/50 rounded-xl p-1">
                <button onClick={() => setSourceType(AudioSourceType.MICROPHONE)} className={`p-2 rounded-lg ${sourceType === AudioSourceType.MICROPHONE ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} title="Microphone"><Mic size={16}/></button>
                <button onClick={onTabShare} className={`p-2 rounded-lg ${sourceType === AudioSourceType.TAB ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} title="Tab Audio"><Monitor size={16}/></button>
                <button onClick={() => fileImportRef.current?.click()} className={`p-2 rounded-lg ${sourceType === AudioSourceType.FILE ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} title="Upload File"><Upload size={16}/></button>
                <button onClick={() => setSourceType(AudioSourceType.OSCILLATOR)} className={`p-2 rounded-lg ${sourceType === AudioSourceType.OSCILLATOR ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} title="Demo"><Music size={16}/></button>
                <input ref={fileImportRef} type="file" accept="audio/*" className="hidden" onChange={onFileUpload} />
            </div>

            <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-zinc-400"/>
                    <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-20 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none accent-zinc-900 dark:accent-zinc-100" />
            </div>
        </div>
    </div>
  );
};

export default WorkspaceFooter;
