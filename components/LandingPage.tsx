
import React from 'react';
import { Mic, Music, Youtube, Check, Activity, Chrome, Aperture, Command, Sun, Moon, Laptop } from 'lucide-react';
import { Theme } from '../types';

interface LandingPageProps {
  onGetAccess: () => void;
  onLogin: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetAccess, onLogin, theme, setTheme }) => {
  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center p-4 sm:p-8 text-zinc-900 dark:text-zinc-100 antialiased selection:bg-zinc-200 dark:selection:bg-zinc-800 bg-zinc-100 dark:bg-zinc-950 transition-colors duration-500">
      <main className="relative w-full max-w-7xl h-full max-h-[900px] bg-white dark:bg-zinc-900 rounded-[32px] shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_24px_60px_-12px_rgba(0,0,0,0.06)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_24px_60px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transition-colors duration-500">
        
        {/* Navigation */}
        <nav className="flex items-center justify-between px-8 py-6 z-10">
            <div className="flex items-center gap-2">
                <span className="text-lg font-medium tracking-tighter text-zinc-900 dark:text-white">resonator</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
                <a href="#" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors duration-300">Features</a>
                <a href="#" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors duration-300">Sources</a>
                <a href="#" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors duration-300">SDK</a>
            </div>

            <div className="flex items-center gap-4">
                 {/* Theme Toggle */}
                 <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full p-1 border border-zinc-200 dark:border-zinc-700 transition-colors duration-300">
                    <button onClick={() => setTheme('light')} className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}><Sun size={14}/></button>
                    <button onClick={() => setTheme('system')} className={`p-1.5 rounded-full transition-all ${theme === 'system' ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}><Laptop size={14}/></button>
                    <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-white dark:bg-zinc-600 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}><Moon size={14}/></button>
                </div>
                
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800"></div>

                <button onClick={onLogin} className="text-sm font-medium text-zinc-900 hover:text-zinc-600 dark:text-zinc-200 dark:hover:text-zinc-400 transition-colors">Log in</button>
                <button 
                  onClick={onGetAccess}
                  className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium px-4 py-2 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
                >
                    Get Access
                </button>
            </div>
        </nav>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col w-full relative items-center justify-center">
            
            {/* Radial Gradient Background Effect */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none transition-all duration-500" style={{ background: 'radial-gradient(circle at 50% 50%, var(--gradient-color, #f4f4f5) 0%, transparent 60%)' }}>
                 <style>{`.dark div[style*="radial-gradient"] { --gradient-color: #27272a; }`}</style>
            </div>

            <div className="z-10 flex flex-col items-center text-center max-w-2xl px-6">
                
                {/* Version Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-50 border border-zinc-200/60 dark:bg-zinc-800/50 dark:border-zinc-700/50 mb-8 transition-colors duration-300">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 dark:bg-zinc-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-900 dark:bg-zinc-100"></span>
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium tracking-tight">System Audio Bridge Live</span>
                </div>

                {/* Headline */}
                <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-zinc-900 dark:text-white mb-6 leading-[1.1] transition-colors duration-300">
                    See the sound.
                </h1>
                
                {/* Subheadline */}
                <p className="leading-relaxed text-lg font-normal text-zinc-500 dark:text-zinc-400 tracking-tight max-w-md mb-12 transition-colors duration-300">
                    High-fidelity audio visualization directly from your browser. Connect mic, system audio, or stream services.
                </p>

                {/* Input Controls (Custom UI - Visual Only on Landing) */}
                <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-1.5 shadow-sm mb-16 flex items-center justify-between transition-colors duration-300">
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 transition-all group">
                        <Mic className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                        <span className="text-xs font-medium">Mic</span>
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all group hover:bg-zinc-50 dark:hover:bg-zinc-800">
                        <Music className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
                        <span className="text-xs font-medium">Spotify</span>
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all group hover:bg-zinc-50 dark:hover:bg-zinc-800">
                        <Youtube className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
                        <span className="text-xs font-medium">Stream</span>
                    </button>
                </div>

                {/* Visualizer Demo Animation */}
                <div className="flex items-end justify-center gap-1.5 h-32 w-full max-w-md mx-auto relative">
                    <div className="w-2.5 bg-zinc-900/10 dark:bg-zinc-100/10 rounded-full h-full animate-scale-twice delay-0 origin-bottom"></div>
                    <div className="w-2.5 bg-zinc-900/20 dark:bg-zinc-100/20 rounded-full h-full animate-scale-twice delay-150 origin-bottom"></div>
                    <div className="w-2.5 bg-zinc-900/40 dark:bg-zinc-100/40 rounded-full h-full animate-scale-twice delay-75 origin-bottom"></div>
                    <div className="w-2.5 bg-zinc-900/80 dark:bg-zinc-100/80 rounded-full h-full animate-scale-twice delay-300 origin-bottom"></div>
                    <div className="w-2.5 bg-zinc-900 dark:bg-zinc-100 rounded-full h-full animate-scale-twice delay-225 origin-bottom"></div>
                    <div className="w-2.5 bg-zinc-900/80 dark:bg-zinc-100/80 rounded-full h-full animate-scale-twice delay-75 origin-bottom"></div>
                    <div className="w-2.5 bg-zinc-900/40 dark:bg-zinc-100/40 rounded-full h-full animate-scale-twice delay-300 origin-bottom"></div>
                    <div className="w-2.5 bg-zinc-900/20 dark:bg-zinc-100/20 rounded-full h-full animate-scale-twice delay-150 origin-bottom"></div>
                    <div className="w-2.5 bg-zinc-900/10 dark:bg-zinc-100/10 rounded-full h-full animate-scale-twice delay-0 origin-bottom"></div>
                </div>

                {/* Footer Meta */}
                <div className="mt-12 flex items-center gap-6 text-zinc-400 dark:text-zinc-500">
                    <div className="flex items-center gap-2">
                        <Check className="w-3 h-3" />
                        <span className="text-xs">Zero Latency</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check className="w-3 h-3" />
                        <span className="text-xs">4K Rendering</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check className="w-3 h-3" />
                        <span className="text-xs">WebGL 2.0</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Integration Grid / Footer Area */}
        <div className="w-full border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors duration-300">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-center text-zinc-900 dark:text-zinc-100">
                    <Activity className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Real-time Analysis</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Processed locally on device</span>
                </div>
            </div>

            <div className="flex items-center gap-3">
               <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-wider mr-2">Compatible with</span>
               <Chrome className="w-4 h-4 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors" />
               <Aperture className="w-4 h-4 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors" />
               <Command className="w-4 h-4 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors" />
            </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
