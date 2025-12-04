
import React from 'react';
import { Activity, X, Group, ArrowRight, ChevronDown } from 'lucide-react';
import { VisualizerElement, AnimationTrack, AnimationDriver, AnimationTarget } from '../../types';
import { hexToHSL, hslToHex, getPreviewColor, getDefaultFillEnabled, getDefaultStrokeEnabled } from './utils';
import { findElementById } from './elementTree';

interface WorkspacePropertiesProps {
  selectedIds: Set<string>;
  elements: VisualizerElement[];
  onUpdate: (id: string, updates: Partial<VisualizerElement>) => void;
  onGroup: () => void;
}

const WorkspaceProperties: React.FC<WorkspacePropertiesProps> = ({ selectedIds, elements, onUpdate, onGroup }) => {
  const getAllElements = (list: VisualizerElement[]): {id: string, name: string}[] => {
      let result: {id: string, name: string}[] = [];
      list.forEach(el => {
          result.push({ id: el.id, name: el.name });
          if(el.children) result = [...result, ...getAllElements(el.children)];
      });
      return result;
  };

  if (selectedIds.size === 0) {
      return (
        <div className="w-80 border-l border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-y-auto shrink-0 z-20 custom-scrollbar">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800"><span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Properties</span></div>
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-3 p-8 text-center">
                <p className="text-sm">Select an element to edit properties</p>
            </div>
        </div>
      );
  }

  if (selectedIds.size > 1) {
      return (
        <div className="w-80 border-l border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-y-auto shrink-0 z-20 custom-scrollbar">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800"><span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Properties</span></div>
            <div className="p-8 text-center text-zinc-500">
                <Group size={32} className="mx-auto mb-4 text-zinc-300"/>
                <p>{selectedIds.size} items selected</p>
                <button onClick={onGroup} className="mt-4 px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs">Group Items</button>
            </div>
        </div>
      );
  }

  const id = Array.from(selectedIds)[0] as string;
  const el = findElementById(id, elements);
  if (!el) return null;
  const allElementsList = getAllElements(elements).filter(item => item.id !== id);
  const supportsFill = el.type !== 'line';
  const fillEnabled = el.fillEnabled ?? getDefaultFillEnabled(el.type);
  const strokeEnabled = el.strokeEnabled ?? getDefaultStrokeEnabled(el.type);
  const strokeColor = el.strokeColor || el.color;
  const strokeWidthValue = el.type === 'line' ? el.height : (el.strokeWidth ?? 2);
  const handleStrokeWidthChange = (value: number) => {
      if (Number.isNaN(value)) return;
      const clamped = Math.max(0, value);
      if (el.type === 'line') {
          onUpdate(id, { height: clamped, strokeWidth: clamped });
      } else {
          onUpdate(id, { strokeWidth: clamped });
      }
  };

  return (
    <div className="w-80 border-l border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-y-auto shrink-0 z-20 custom-scrollbar">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800"><span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Properties</span></div>
        
        <div className="p-6 pb-24">
            <div className="flex flex-col gap-2 mb-6">
                <label className="text-xs font-medium text-zinc-500">Name</label>
                <input className="bg-zinc-50 dark:bg-zinc-800 rounded-xl px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700" value={el.name} onChange={(e) => onUpdate(id, { name: e.target.value })} />
            </div>

            {/* Transform */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Transform</span></div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase">Pos X %</label>
                        <input type="number" step="0.01" className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700" value={(el.x * 100).toFixed(1)} onChange={(e) => onUpdate(id, { x: parseFloat(e.target.value)/100 })} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase">Pos Y %</label>
                        <input type="number" step="0.01" className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700" value={(el.y * 100).toFixed(1)} onChange={(e) => onUpdate(id, { y: parseFloat(e.target.value)/100 })} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase">Width</label>
                        <input type="number" className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700" value={Math.round(el.width)} onChange={(e) => onUpdate(id, { width: parseFloat(e.target.value) })} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase">Height</label>
                        <input type="number" className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700" value={Math.round(el.height)} onChange={(e) => onUpdate(id, { height: parseFloat(e.target.value) })} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase">Rotation</label>
                        <div className="flex items-center gap-2">
                            <input type="range" min="0" max="360" className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none accent-zinc-900 dark:accent-zinc-100" value={Math.round(el.rotation)} onChange={(e) => onUpdate(id, { rotation: parseFloat(e.target.value) })} />
                            <input type="number" className="w-12 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-1 py-0.5 text-[10px] border border-zinc-200 dark:border-zinc-700 text-center" value={Math.round(el.rotation)} onChange={(e) => onUpdate(id, { rotation: parseFloat(e.target.value) })} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase">Opacity</label>
                        <div className="flex items-center gap-2">
                            <input type="range" min="0" max="1" step="0.01" className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none accent-zinc-900 dark:accent-zinc-100" value={el.opacity} onChange={(e) => onUpdate(id, { opacity: parseFloat(e.target.value) })} />
                            <input type="number" step="0.1" max="1" min="0" className="w-12 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-1 py-0.5 text-[10px] border border-zinc-200 dark:border-zinc-700 text-center" value={Number(el.opacity).toFixed(1)} onChange={(e) => onUpdate(id, { opacity: parseFloat(e.target.value) })} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-6"></div>

            {/* Appearance */}
            {el.type !== 'group' && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Appearance</span>
                    </div>
                    <div className="flex flex-col gap-4">
                        {supportsFill && (
                            <details className="border border-zinc-100 dark:border-zinc-800 rounded-2xl p-3 bg-zinc-50/50 dark:bg-zinc-800/40" open>
                                <summary className="flex items-center justify-between cursor-pointer select-none [&::-webkit-details-marker]:hidden">
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                        <ChevronDown size={14} className="text-zinc-400 dark:text-zinc-500" />
                                        <span>Fill</span>
                                    </div>
                                    <label onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                                        <input type="checkbox" checked={fillEnabled} onChange={(e) => onUpdate(id, { fillEnabled: e.target.checked })} className="accent-zinc-900 dark:accent-zinc-100" />
                                        <span>{fillEnabled ? 'Enabled' : 'Disabled'}</span>
                                    </label>
                                </summary>
                                <div className={`mt-3 space-y-3 ${fillEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
                                    <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                                        <button 
                                            onClick={() => onUpdate(id, { fillType: 'solid' })}
                                            className={`px-2 py-1 text-[10px] font-bold rounded-md ${el.fillType === 'solid' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400'}`}
                                        >Solid</button>
                                        <button 
                                            onClick={() => onUpdate(id, { fillType: 'gradient' })}
                                            className={`px-2 py-1 text-[10px] font-bold rounded-md ${el.fillType === 'gradient' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400'}`}
                                        >Gradient</button>
                                    </div>

                                    {el.fillType === 'gradient' ? (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-zinc-400 w-8">Start</span>
                                                <div className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-inner overflow-hidden relative shrink-0">
                                                    <input type="color" className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" value={el.gradient?.start || el.color} onChange={(e) => onUpdate(id, { gradient: { ...(el.gradient || { end: el.color, angle: 90 }), start: e.target.value } })} />
                                                </div>
                                                <input type="text" className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-xs border border-zinc-200 dark:border-zinc-700 font-mono uppercase" value={el.gradient?.start || el.color} onChange={(e) => onUpdate(id, { gradient: { ...(el.gradient || { end: el.color, angle: 90 }), start: e.target.value } })} />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-zinc-400 w-8">End</span>
                                                <div className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-inner overflow-hidden relative shrink-0">
                                                    <input type="color" className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer" value={el.gradient?.end || el.color} onChange={(e) => onUpdate(id, { gradient: { ...(el.gradient || { start: el.color, angle: 90 }), end: e.target.value } })} />
                                                </div>
                                                <input type="text" className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-xs border border-zinc-200 dark:border-zinc-700 font-mono uppercase" value={el.gradient?.end || el.color} onChange={(e) => onUpdate(id, { gradient: { ...(el.gradient || { start: el.color, angle: 90 }), end: e.target.value } })} />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-zinc-400 w-8">Angle</span>
                                                <input type="range" min="0" max="360" className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none accent-zinc-900 dark:accent-zinc-100" value={el.gradient?.angle || 90} onChange={(e) => onUpdate(id, { gradient: { ...(el.gradient || { start: el.color, end: el.color }), angle: parseInt(e.target.value) } })} />
                                                <span className="text-[10px] text-zinc-500 w-8 text-right">{el.gradient?.angle || 90}°</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-inner overflow-hidden relative shrink-0">
                                                <input type="color" className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" value={el.color} onChange={(e) => onUpdate(id, { color: e.target.value })} />
                                            </div>
                                            <input type="text" className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-xs border border-zinc-200 dark:border-zinc-700 font-mono uppercase" value={el.color} onChange={(e) => onUpdate(id, { color: e.target.value })} />
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}

                        <details className="border border-zinc-100 dark:border-zinc-800 rounded-2xl p-3 bg-zinc-50/50 dark:bg-zinc-800/40" open>
                            <summary className="flex items-center justify-between cursor-pointer select-none [&::-webkit-details-marker]:hidden">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                    <ChevronDown size={14} className="text-zinc-400 dark:text-zinc-500" />
                                    <span>Outline</span>
                                </div>
                                <label onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-[10px] font-bold text-zinc-500">
                                    <input type="checkbox" checked={strokeEnabled} onChange={(e) => onUpdate(id, { strokeEnabled: e.target.checked })} className="accent-zinc-900 dark:accent-zinc-100" />
                                    <span>{strokeEnabled ? 'Enabled' : 'Disabled'}</span>
                                </label>
                            </summary>
                            <div className={`mt-3 space-y-3 ${strokeEnabled ? '' : 'opacity-50 pointer-events-none'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-inner overflow-hidden relative shrink-0">
                                        <input type="color" className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" value={strokeColor} onChange={(e) => onUpdate(id, { strokeColor: e.target.value })} />
                                    </div>
                                    <input type="text" className="flex-1 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 text-xs border border-zinc-200 dark:border-zinc-700 font-mono uppercase" value={strokeColor} onChange={(e) => onUpdate(id, { strokeColor: e.target.value })} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] text-zinc-400 font-bold uppercase">Width</label>
                                    <div className="flex items-center gap-2">
                                        <input type="range" min="0" max="40" step="0.5" className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none accent-zinc-900 dark:accent-zinc-100" value={Number(strokeWidthValue.toFixed(1))} onChange={(e) => handleStrokeWidthChange(parseFloat(e.target.value))} />
                                        <input type="number" min="0" step="0.5" className="w-14 bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2 py-1 text-[10px] border border-zinc-200 dark:border-zinc-700" value={strokeWidthValue.toFixed(1)} onChange={(e) => handleStrokeWidthChange(parseFloat(e.target.value))} />
                                    </div>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            )}

            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-6"></div>

            {/* Animations */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Activity size={14} className="text-zinc-500" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Animations</span>
                    </div>
                    <button onClick={() => {
                        const newTrack: AnimationTrack = {
                            id: Math.random().toString(36).substring(2, 7),
                            target: 'scale',
                            driver: 'audio',
                            duration: 2000,
                            frequencyRange: [0, 0.2],
                            keyframes: [{ id: 'k1', offset: 0, value: 1 }, { id: 'k2', offset: 1, value: 1.5 }],
                            enabled: true
                        };
                        onUpdate(id, { animationTracks: [...el.animationTracks, newTrack] });
                    }} className="px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold rounded-md hover:opacity-80">+ Add Track</button>
                </div>

                <div className="flex flex-col gap-4">
                    {el.animationTracks.map((track, idx) => (
                        <div key={track.id} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${track.enabled ? 'bg-green-500' : 'bg-zinc-300'}`}></div>
                                    <select className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md py-0.5 px-1 text-xs font-bold outline-none" value={track.target} onChange={(e) => {
                                        const newTarget = e.target.value as AnimationTarget;
                                        // Set reasonable defaults
                                        let defVal: string | number = 1.5;
                                        if(newTarget === 'x' || newTarget === 'y') defVal = 0.2;
                                        if(newTarget === 'rotation' || newTarget === 'hue') defVal = 180;
                                        if(newTarget === 'layer') defVal = 'front';
                                        if(newTarget === 'color') defVal = el.color; // Default to base color
                                        
                                        const updatedTracks = el.animationTracks.map((t, i) => {
                                            if (i !== idx) return t;
                                            const updatedKeyframes = t.keyframes.map(k => ({...k, value: defVal}));
                                            return { ...t, target: newTarget, keyframes: updatedKeyframes };
                                        });

                                        onUpdate(id, { animationTracks: updatedTracks });
                                    }}>
                                        <option value="scale">Scale</option>
                                        <option value="opacity">Opacity</option>
                                        <option value="rotation">Rotation</option>
                                        <option value="x">Pos X</option>
                                        <option value="y">Pos Y</option>
                                        <option value="hue">Color Hue</option>
                                        <option value="saturation">Color Sat</option>
                                        <option value="color">Color</option>
                                        <option value="layer">Layer (Z-Index)</option>
                                    </select>
                                </div>
                                <button onClick={() => {
                                    const updatedTracks = el.animationTracks.filter((_, i) => i !== idx);
                                    onUpdate(id, { animationTracks: updatedTracks });
                                }} className="text-zinc-400 hover:text-red-500"><X size={12}/></button>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-3">
                                <select className="flex-1 bg-white dark:bg-zinc-800 text-[10px] border border-zinc-200 dark:border-zinc-700 rounded-md py-1 px-1" value={track.driver} onChange={(e) => {
                                    const updatedTracks = el.animationTracks.map((t, i) => i === idx ? { ...t, driver: e.target.value as AnimationDriver } : t);
                                    onUpdate(id, { animationTracks: updatedTracks });
                                }}>
                                    <option value="audio">Audio React</option>
                                    <option value="time">Loop (Time)</option>
                                </select>
                                {track.driver === 'time' && (
                                    <input type="number" className="w-16 bg-white dark:bg-zinc-800 text-[10px] border border-zinc-200 dark:border-zinc-700 rounded-md py-1 px-1" value={track.duration} onChange={(e) => {
                                        const updatedTracks = el.animationTracks.map((t, i) => i === idx ? { ...t, duration: parseFloat(e.target.value) } : t);
                                        onUpdate(id, { animationTracks: updatedTracks });
                                    }} />
                                )}
                            </div>

                            {track.driver === 'audio' && (
                                <div className="mb-3 p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700/50">
                                    <div className="flex justify-between text-[9px] text-zinc-400 mb-1 uppercase font-bold">
                                        <span>Range</span>
                                        <span>0Hz - 22kHz</span>
                                    </div>
                                    <div className="h-2 bg-zinc-300 dark:bg-zinc-700 rounded-full relative overflow-hidden mb-2">
                                        <div className="absolute top-0 bottom-0 bg-blue-500 opacity-50" style={{ left: `${track.frequencyRange[0]*100}%`, width: `${(track.frequencyRange[1]-track.frequencyRange[0])*100}%` }}></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] text-zinc-400">Min Hz</label>
                                            <input 
                                                type="number" 
                                                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-[10px]"
                                                value={Math.round(track.frequencyRange[0] * 22050)}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                    const pct = val / 22050;
                                                    const updatedTracks = el.animationTracks.map((t, i) => {
                                                        if (i !== idx) return t;
                                                        const newRange = [...t.frequencyRange] as [number, number];
                                                        newRange[0] = Math.min(pct, newRange[1]);
                                                        return { ...t, frequencyRange: newRange };
                                                    });
                                                    onUpdate(id, { animationTracks: updatedTracks });
                                                }}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[9px] text-zinc-400">Max Hz</label>
                                            <input 
                                                type="number" 
                                                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-[10px]"
                                                value={Math.round(track.frequencyRange[1] * 22050)}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    const val = Math.min(22050, parseInt(e.target.value) || 0);
                                                    const pct = val / 22050;
                                                    const updatedTracks = el.animationTracks.map((t, i) => {
                                                        if (i !== idx) return t;
                                                        const newRange = [...t.frequencyRange] as [number, number];
                                                        newRange[1] = Math.max(pct, newRange[0]);
                                                        return { ...t, frequencyRange: newRange };
                                                    });
                                                    onUpdate(id, { animationTracks: updatedTracks });
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Visual Timeline */}
                            <div className="mt-4 mb-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Timeline</span>
                                </div>
                                <div 
                                    className="h-6 relative flex items-center cursor-pointer group/timeline"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const pct = (e.clientX - rect.left) / rect.width;
                                        // Default value based on target
                                        let val: string | number = 1;
                                        if (track.target === 'layer') val = 'front';
                                        if (track.target === 'color') val = el.color;

                                        const newKf = { id: Math.random().toString(36).substring(2, 7), offset: Math.max(0, Math.min(1, pct)), value: val };
                                        const updatedTracks = el.animationTracks.map((t, i) => {
                                            if (i !== idx) return t;
                                            return { ...t, keyframes: [...t.keyframes, newKf].sort((a,b) => a.offset - b.offset) };
                                        });
                                        onUpdate(id, { animationTracks: updatedTracks });
                                    }}
                                >
                                    <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full group-hover/timeline:bg-zinc-300 dark:group-hover/timeline:bg-zinc-600 transition-colors"></div>
                                    {track.keyframes.map((kf, kfIdx) => (
                                        <div 
                                            key={kf.id}
                                            className="absolute w-3 h-3 bg-zinc-900 dark:bg-zinc-100 border border-white dark:border-zinc-900 rounded-full hover:scale-125 transition-transform shadow-sm"
                                            style={{ left: `calc(${kf.offset * 100}% - 6px)` }}
                                            title={`Offset: ${(kf.offset * 100).toFixed(0)}%`}
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            {/* Keyframes Inputs */}
                            <div className="space-y-1 mt-2">
                                <div className="flex justify-between text-[9px] text-zinc-400 font-bold uppercase px-1">
                                    <span>Value</span>
                                    <span>Offset</span>
                                </div>
                                {track.keyframes.map((kf, kfIdx) => {
                                    const isTime = track.driver === 'time';
                                    const displayVal = isTime ? Math.round(kf.offset * track.duration) : Math.round(kf.offset * 100);
                                    const unit = isTime ? 'ms' : '%';
                                    const maxVal = isTime ? track.duration : 100;

                                    return (
                                    <div key={kf.id} className="flex items-center justify-between gap-2">
                                        
                                        {/* Value Part */}
                                        <div className="flex-1 min-w-0 flex justify-start">
                                            {track.target === 'hue' ? (
                                                    <div className="flex items-center gap-1 justify-start w-full">
                                                        <div className="w-6 h-6 rounded border border-zinc-200 dark:border-zinc-600 relative overflow-hidden shrink-0">
                                                            <div className="absolute inset-0" style={{ backgroundColor: getPreviewColor(el.color, 'hue', Number(kf.value)) }}></div>
                                                            <input type="color" className="absolute opacity-0 inset-0 w-full h-full cursor-pointer" value={hslToHex(hexToHSL(el.color).h + Number(kf.value), 100, 50)} onChange={(e) => {
                                                                const targetHex = e.target.value;
                                                                const targetH = hexToHSL(targetHex).h;
                                                                const baseH = hexToHSL(el.color).h;
                                                                let diff = targetH - baseH;
                                                                if(diff < 0) diff += 360;
                                                                
                                                                const updatedTracks = el.animationTracks.map((t, i) => {
                                                                    if (i !== idx) return t;
                                                                    const newKeyframes = t.keyframes.map((k, ki) => {
                                                                        if (ki !== kfIdx) return k;
                                                                        return { ...k, value: diff };
                                                                    });
                                                                    return { ...t, keyframes: newKeyframes };
                                                                });
                                                                onUpdate(id, { animationTracks: updatedTracks });
                                                            }} />
                                                        </div>
                                                        <input type="text" className="w-16 text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-1 py-1 text-left" value={hslToHex(hexToHSL(el.color).h + Number(kf.value), hexToHSL(el.color).s, hexToHSL(el.color).l)} onChange={(e) => { /* Hex edit logic */ }} />
                                                    </div>
                                            ) : track.target === 'color' ? (
                                                /* Color Interpolation Keyframe Input */
                                                <div className="flex items-center gap-1 justify-start w-full">
                                                    <div className="w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-600 relative overflow-hidden shrink-0">
                                                        <input type="color" className="absolute -top-1 -left-1 w-8 h-8 cursor-pointer" value={String(kf.value)} onChange={(e) => {
                                                             const updatedTracks = el.animationTracks.map((t, i) => {
                                                                if (i !== idx) return t;
                                                                const newKeyframes = t.keyframes.map((k, ki) => {
                                                                    if (ki !== kfIdx) return k;
                                                                    return { ...k, value: e.target.value };
                                                                });
                                                                return { ...t, keyframes: newKeyframes };
                                                            });
                                                            onUpdate(id, { animationTracks: updatedTracks });
                                                        }} />
                                                    </div>
                                                    <input type="text" className="w-16 text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-1 py-1 text-left uppercase" value={String(kf.value)} readOnly />
                                                </div>
                                            ) : track.target === 'layer' ? (
                                                <select 
                                                    className="w-full text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-1 py-1"
                                                    value={String(kf.value)}
                                                    onChange={(e) => {
                                                        const updatedTracks = el.animationTracks.map((t, i) => {
                                                            if (i !== idx) return t;
                                                            const newKeyframes = t.keyframes.map((k, ki) => {
                                                                if (ki !== kfIdx) return k;
                                                                return { ...k, value: e.target.value };
                                                            });
                                                            return { ...t, keyframes: newKeyframes };
                                                        });
                                                        onUpdate(id, { animationTracks: updatedTracks });
                                                    }}
                                                >
                                                    <option value="front">Front (Top)</option>
                                                    <option value="back">Back (Bottom)</option>
                                                    {allElementsList.length > 0 && <optgroup label="Relative to...">
                                                        {allElementsList.map(item => (
                                                            <React.Fragment key={item.id}>
                                                                <option value={`before:${item.id}`}>Behind {item.name}</option>
                                                                <option value={`after:${item.id}`}>In Front of {item.name}</option>
                                                            </React.Fragment>
                                                        ))}
                                                    </optgroup>}
                                                </select>
                                            ) : (
                                                <input type="number" step="0.1" className="w-16 text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-1 py-1 text-left" value={kf.value} onChange={(e) => {
                                                    const updatedTracks = el.animationTracks.map((t, i) => {
                                                        if (i !== idx) return t;
                                                        const newKeyframes = t.keyframes.map((k, ki) => {
                                                            if (ki !== kfIdx) return k;
                                                            return { ...k, value: parseFloat(e.target.value) };
                                                        });
                                                        return { ...t, keyframes: newKeyframes };
                                                    });
                                                    onUpdate(id, { animationTracks: updatedTracks });
                                                }} />
                                            )}
                                        </div>
                                        
                                        <ArrowRight size={12} className="text-zinc-300 dark:text-zinc-600 shrink-0" />

                                        {/* Offset Part (Moved to Right) */}
                                        <div className="relative w-14 shrink-0">
                                            <input 
                                                type="number" 
                                                className="w-full text-[10px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-1 py-1 pr-4 text-right" 
                                                value={displayVal} 
                                                onChange={(e) => {
                                                    let val = parseFloat(e.target.value);
                                                    if(isNaN(val)) val = 0;
                                                    val = Math.max(0, Math.min(val, maxVal));
                                                    
                                                    const updatedTracks = el.animationTracks.map((t, i) => {
                                                        if (i !== idx) return t;
                                                        const newKeyframes = t.keyframes.map((k, ki) => {
                                                            if (ki !== kfIdx) return k;
                                                            return { ...k, offset: isTime ? (val / track.duration) : (val / 100) };
                                                        });
                                                        return { ...t, keyframes: newKeyframes };
                                                    });
                                                    onUpdate(id, { animationTracks: updatedTracks });
                                                }} 
                                            />
                                            <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-zinc-400 select-none">{unit}</span>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default WorkspaceProperties;
