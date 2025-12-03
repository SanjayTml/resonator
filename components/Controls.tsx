import React, { useRef } from 'react';
import { 
  Play, Pause, Mic, Music, Upload, Monitor,
  BarChart2, Activity, Disc, Zap, 
  Maximize, Minimize, Volume2
} from 'lucide-react';
import { AppState, AudioSourceType, Quality, VisualizerMode } from '../types';

interface ControlsProps {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  onFileUpload: (file: File) => void;
  onTabStream: (stream: MediaStream) => void;
  trackMeta: { title: string; currentTime: number; duration: number; };
  onSeek: (time: number) => void;
  forceVisible: boolean;
}

const Controls: React.FC<ControlsProps> = ({ 
  state, 
  updateState, 
  onFileUpload, 
  onTabStream,
  trackMeta,
  onSeek,
  forceVisible
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const handleTabShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 2
        } as any
      });

      if (stream.getAudioTracks().length === 0) {
        alert("No audio track found. Please ensure 'Share tab audio' is checked in the dialog.");
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      onTabStream(stream);
      updateState({ source: AudioSourceType.TAB, isPlaying: true });

    } catch (err) {
      console.error("Error sharing tab:", err);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`
      fixed bottom-0 left-0 w-full z-50 flex items-end justify-center pb-8 pt-32
      transition-all duration-500
      group/controls
      ${forceVisible ? 'pointer-events-auto' : 'pointer-events-none hover:pointer-events-auto'}
    `}>
      
      {/* Glass Panel */}
      <div className={`
        bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-2xl 
        rounded-3xl p-4 flex flex-col gap-5 w-[92%] max-w-3xl
        transition-all duration-500 ease-out transform
        ${forceVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-20 group-hover/controls:opacity-100 group-hover/controls:translate-y-0'}
      `}>
        
        {/* Main Controls Row */}
        <div className="flex items-center justify-between gap-4">
          
          {/* Play & Source Section */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => updateState({ isPlaying: !state.isPlaying })}
              className="w-12 h-12 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg shadow-zinc-200 dark:shadow-none"
            >
              {state.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
            </button>
            
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 hidden xs:block"></div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => updateState({ source: AudioSourceType.MICROPHONE })}
                className={`p-2 rounded-xl transition-all ${state.source === AudioSourceType.MICROPHONE ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                title="Microphone"
              >
                <Mic size={18} />
              </button>
              
              <button 
                onClick={handleTabShare}
                className={`p-2 rounded-xl transition-all ${state.source === AudioSourceType.TAB ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                title="Browser Tab"
              >
                <Monitor size={18} />
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-xl transition-all ${state.source === AudioSourceType.FILE ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                title="Upload File"
              >
                <Upload size={18} />
              </button>
              
              <button 
                onClick={() => updateState({ source: AudioSourceType.OSCILLATOR })}
                className={`p-2 rounded-xl transition-all ${state.source === AudioSourceType.OSCILLATOR ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}
                title="Demo Tone"
              >
                <Music size={18} />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
            </div>
          </div>

          {/* Center Info Section - Dynamic */}
          <div className="flex-1 hidden md:flex flex-col items-center justify-center min-w-0 px-6">
            
            {state.source === AudioSourceType.FILE && (
              <div className="w-full max-w-[240px] flex flex-col items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate w-full text-center">
                  {trackMeta.title || "No File Selected"}
                </span>
                <div className="w-full flex items-center gap-2">
                   <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums w-8 text-right">{formatTime(trackMeta.currentTime)}</span>
                   <input 
                      type="range" 
                      min="0" 
                      max={trackMeta.duration || 100} 
                      value={trackMeta.currentTime}
                      onChange={(e) => onSeek(parseFloat(e.target.value))}
                      className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-900 dark:[&::-webkit-slider-thumb]:bg-zinc-100 cursor-pointer"
                   />
                   <span className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums w-8">{formatTime(trackMeta.duration)}</span>
                </div>
              </div>
            )}

            {state.source === AudioSourceType.TAB && (
               <div className="flex flex-col items-center">
                   <div className="flex items-center gap-2 mb-1">
                      <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">Live Tab</span>
                   </div>
                   <span className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate">{trackMeta.title || "System Audio"}</span>
               </div>
            )}

            {state.source === AudioSourceType.MICROPHONE && (
               <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                      <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">Microphone</span>
                  </div>
                   <span className="text-xs text-zinc-500 dark:text-zinc-400">Listening to input...</span>
               </div>
            )}

            {state.source === AudioSourceType.OSCILLATOR && (
               <div className="flex flex-col items-center">
                   <div className="flex items-center gap-2">
                      <Zap size={12} className="text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">Demo Signal</span>
                   </div>
                   <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">440Hz Sine + LFO</span>
               </div>
            )}
          </div>

          {/* Volume & Fullscreen */}
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 group">
                <Volume2 size={16} className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                <input 
                  type="range" 
                  min="0" max="1" step="0.01" 
                  value={state.volume}
                  onChange={(e) => updateState({ volume: parseFloat(e.target.value) })}
                  className="w-20 accent-zinc-900 dark:accent-zinc-100 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                />
             </div>

             <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block"></div>

             <button 
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen();
                  updateState({ isFullscreen: true });
                } else {
                  if (document.exitFullscreen) {
                    document.exitFullscreen();
                    updateState({ isFullscreen: false });
                  }
                }
              }}
              className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
            >
              {state.isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>

        {/* Mode & Quality Selector */}
        <div className="flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-800/80 rounded-2xl p-1.5 border border-zinc-200/50 dark:border-zinc-700/50 transition-colors">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
             {[
               { m: VisualizerMode.BARS, icon: BarChart2, label: 'Bars' },
               { m: VisualizerMode.WAVE, icon: Activity, label: 'Wave' },
               { m: VisualizerMode.CIRCLE, icon: Disc, label: 'Radial' },
               { m: VisualizerMode.PARTICLES, icon: Zap, label: 'Particles' },
             ].map((modeOpt) => (
               <button
                  key={modeOpt.m}
                  onClick={() => updateState({ mode: modeOpt.m })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all min-w-[80px] ${
                    state.mode === modeOpt.m 
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' 
                      : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50'
                  }`}
               >
                  <modeOpt.icon size={14} />
                  {modeOpt.label}
               </button>
             ))}
          </div>
          
          {/* Quality Toggle (Hidden on mobile) */}
          <div className="hidden sm:flex items-center bg-zinc-50/80 dark:bg-zinc-800/80 rounded-2xl p-1.5 border border-zinc-200/50 dark:border-zinc-700/50 ml-4 transition-colors">
            {[Quality.LOW, Quality.MEDIUM, Quality.HIGH].map((q) => (
              <button
                key={q}
                onClick={() => updateState({ quality: q })}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                  state.quality === q
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;