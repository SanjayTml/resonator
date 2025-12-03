
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import VisualizerCanvas from './components/VisualizerCanvas';
import Controls from './components/Controls';
import Workspace from './components/Workspace';
import { AppState, AudioSourceType, Quality, VisualizerMode, Theme, AppView } from './types';
import { X, Pin, Sun, Moon, Laptop } from 'lucide-react';

const App: React.FC = () => {
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [tabStream, setTabStream] = useState<MediaStream | null>(null);
  
  // Theme State
  const [theme, setTheme] = useState<Theme>('system');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // UI State
  const [isPinned, setIsPinned] = useState(false);
  const [isUIActive, setIsUIActive] = useState(false);

  // Track Metadata State
  const [trackMeta, setTrackMeta] = useState({
    title: '',
    currentTime: 0,
    duration: 0
  });

  const [appState, setAppState] = useState<AppState>({
    view: 'landing', // 'landing' | 'visualizer' | 'workspace'
    isPlaying: false,
    mode: VisualizerMode.BARS,
    source: AudioSourceType.MICROPHONE,
    quality: Quality.MEDIUM,
    volume: 0.8,
    isFullscreen: false,
  });

  // Handle Theme Changes
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    const checkSystem = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (theme === 'system') {
      const systemIsDark = checkSystem();
      setIsDarkMode(systemIsDark);
      root.classList.add(systemIsDark ? 'dark' : 'light');
    } else {
      setIsDarkMode(theme === 'dark');
      root.classList.add(theme);
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        setIsDarkMode(e.matches);
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Cleanup tab stream when switching away from TAB source
  useEffect(() => {
    if (appState.source !== AudioSourceType.TAB && tabStream) {
      tabStream.getTracks().forEach(track => track.stop());
      setTabStream(null);
    }
  }, [appState.source, tabStream]);

  // Clean up Audio Element when switching away from FILE
  useEffect(() => {
    if (appState.source !== AudioSourceType.FILE && audioElement) {
      audioElement.pause();
    }
  }, [appState.source, audioElement]);

  const handleUpdateState = (updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
  };

  const handleFileUpload = (file: File) => {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = "";
    }

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.loop = true;

    audio.addEventListener('loadedmetadata', () => {
      setTrackMeta(prev => ({ 
        ...prev, 
        duration: audio.duration, 
        title: file.name.replace(/\.[^/.]+$/, "")
      }));
    });

    audio.addEventListener('timeupdate', () => {
      setTrackMeta(prev => ({ 
        ...prev, 
        currentTime: audio.currentTime 
      }));
    });

    audio.addEventListener('ended', () => {
       handleUpdateState({ isPlaying: false });
    });

    setAudioElement(audio);
    handleUpdateState({ source: AudioSourceType.FILE, isPlaying: true });
  };

  const handleTabStream = (stream: MediaStream) => {
    if (tabStream) {
      tabStream.getTracks().forEach(track => track.stop());
    }
    
    const audioTrack = stream.getAudioTracks()[0];
    const label = audioTrack?.label || 'Browser Tab';
    
    setTrackMeta({
      title: label,
      currentTime: 0,
      duration: 0
    });

    setTabStream(stream);
  };

  const handleSeek = (time: number) => {
    if (audioElement && appState.source === AudioSourceType.FILE) {
      audioElement.currentTime = time;
      setTrackMeta(prev => ({ ...prev, currentTime: time }));
    }
  };

  const handleGetAccess = () => {
    handleUpdateState({ view: 'visualizer', isPlaying: true });
    // Show UI initially for feedback
    setIsUIActive(true);
    setTimeout(() => setIsUIActive(false), 2500);
  };

  const handleLogin = () => {
    handleUpdateState({ view: 'workspace' });
  };

  const handleCanvasClick = () => {
    if (!isPinned) {
      setIsUIActive(prev => !prev);
    }
  };

  if (appState.view === 'landing') {
    return <LandingPage onGetAccess={handleGetAccess} onLogin={handleLogin} theme={theme} setTheme={setTheme} />;
  }

  if (appState.view === 'workspace') {
    return <Workspace onClose={() => handleUpdateState({ view: 'landing' })} isDarkMode={isDarkMode} />;
  }

  // Visualizer View
  const forceVisible = isPinned || isUIActive;

  return (
    <div className="relative w-screen h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center overflow-hidden transition-colors duration-500">
      
      {/* Background/Frame for App */}
      <div className={`relative transition-all duration-700 ease-in-out ${
        appState.isFullscreen 
          ? 'w-full h-full rounded-none' 
          : 'w-full h-full sm:w-[95%] sm:h-[90%] sm:rounded-[32px] shadow-2xl dark:shadow-zinc-950/50'
      }`}>
        
        {/* Top Hover Zone - Contains Pin, Close Buttons, and Theme Toggle */}
        <div className={`
          absolute top-0 left-0 w-full h-32 z-40 
          bg-gradient-to-b from-black/10 to-transparent 
          transition-opacity duration-500
          flex items-start justify-between p-6 pointer-events-none hover:pointer-events-auto
          group/top
          ${forceVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 hover:opacity-100'}
        `}>
          
          {/* Pin Button */}
          <button 
            onClick={() => setIsPinned(!isPinned)}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center 
              backdrop-blur-md transition-all duration-300 cursor-pointer pointer-events-auto
              ${isPinned 
                ? 'bg-zinc-900 text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900' 
                : 'bg-white/50 text-zinc-600 hover:bg-white hover:text-zinc-900 dark:bg-black/50 dark:text-zinc-400 dark:hover:bg-black/80 dark:hover:text-zinc-100'}
            `}
            title={isPinned ? "Unpin Controls" : "Pin Controls Visible"}
          >
            <Pin size={18} className={isPinned ? "fill-current" : ""} />
          </button>

          <div className="flex items-center gap-3 pointer-events-auto">
             {/* Theme Toggle in Visualizer */}
             <div className="flex items-center bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-full p-1 border border-white/20 dark:border-white/10">
                <button onClick={() => setTheme('light')} className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}><Sun size={14}/></button>
                <button onClick={() => setTheme('system')} className={`p-1.5 rounded-full transition-all ${theme === 'system' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}><Laptop size={14}/></button>
                <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-zinc-700 shadow-sm text-white' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'}`}><Moon size={14}/></button>
            </div>

            {/* Close Button (if not fullscreen) */}
            {!appState.isFullscreen && (
              <button 
                onClick={() => handleUpdateState({ view: 'landing', isPlaying: false })}
                className="w-10 h-10 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-zinc-500 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-all cursor-pointer shadow-sm"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Visualizer Canvas */}
        <VisualizerCanvas 
          isPlaying={appState.isPlaying}
          mode={appState.mode}
          sourceType={appState.source}
          quality={appState.quality}
          volume={appState.volume}
          audioElement={audioElement}
          tabStream={tabStream}
          onCanvasClick={handleCanvasClick}
          isDarkMode={isDarkMode}
        />

        {/* Controls Overlay */}
        <Controls 
          state={appState} 
          updateState={handleUpdateState}
          onFileUpload={handleFileUpload}
          onTabStream={handleTabStream}
          trackMeta={trackMeta}
          onSeek={handleSeek}
          forceVisible={forceVisible}
        />
        
      </div>
    </div>
  );
};

export default App;
