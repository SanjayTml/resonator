
import React, { useState } from 'react';
import { Activity, X, Group, ArrowRight } from 'lucide-react';
import { VisualizerElement, AnimationTrack, AnimationDriver, AnimationTarget } from '../../types';
import { getDefaultFillEnabled, getDefaultStrokeEnabled } from './utils';
import { findElementById } from './elementTree';
import { 
  Button, 
  IconButton, 
  TextInput, 
  NumberInput, 
  SelectInput, 
  FormField, 
  ValueSlider, 
  ColorInput, 
  SectionCard, 
  SectionDivider,
  Toggle
} from '../ui/primitives';

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
                <Button size="sm" className="mt-4" onClick={onGroup}>Group Items</Button>
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
  const [fillSectionOpen, setFillSectionOpen] = useState(true);
  const [outlineSectionOpen, setOutlineSectionOpen] = useState(true);
  const [animationsOpen, setAnimationsOpen] = useState(true);
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
        
        <div className="p-6 pb-24 space-y-6">
            <FormField label="Name">
                <TextInput
                    size="sm"
                    value={el.name}
                    onChange={(e) => onUpdate(id, { name: e.target.value })}
                />
            </FormField>

            <SectionCard title="Transform" muted>
                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Pos X %">
                        <NumberInput
                            size="xs"
                            step={0.01}
                            value={(el.x * 100).toFixed(1)}
                            onChange={(e) => onUpdate(id, { x: parseFloat(e.target.value)/100 })}
                        />
                    </FormField>
                    <FormField label="Pos Y %">
                        <NumberInput
                            size="xs"
                            step={0.01}
                            value={(el.y * 100).toFixed(1)}
                            onChange={(e) => onUpdate(id, { y: parseFloat(e.target.value)/100 })}
                        />
                    </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Width">
                        <NumberInput
                            size="xs"
                            value={Math.round(el.width)}
                            onChange={(e) => onUpdate(id, { width: parseFloat(e.target.value) })}
                        />
                    </FormField>
                    <FormField label="Height">
                        <NumberInput
                            size="xs"
                            value={Math.round(el.height)}
                            onChange={(e) => onUpdate(id, { height: parseFloat(e.target.value) })}
                        />
                    </FormField>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <FormField label="Rotation">
                        <ValueSlider
                            value={el.rotation}
                            onChange={(value) => onUpdate(id, { rotation: value })}
                            min={0}
                            max={360}
                            step={1}
                            numberInputProps={{ step: 1 }}
                        />
                    </FormField>
                    <FormField label="Opacity">
                        <ValueSlider
                            value={el.opacity ?? 1}
                            onChange={(value) => onUpdate(id, { opacity: Math.max(0, Math.min(1, value)) })}
                            min={0}
                            max={1}
                            step={0.01}
                            format={(val) => val.toFixed(1)}
                            parse={(val) => parseFloat(val)}
                            numberInputProps={{ step: 0.1, min: 0, max: 1 }}
                        />
                    </FormField>
                </div>
            </SectionCard>

            <SectionDivider />

            {el.type !== 'group' && (
                <div className="space-y-4">
                    {supportsFill && (
                        <SectionCard
                            title="Fill"
                            collapsible
                            open={fillSectionOpen}
                            onToggle={setFillSectionOpen}
                            actions={
                                <div className="flex items-center gap-2">
                                    <SelectInput
                                        size="xs"
                                        block={false}
                                        className="text-[11px] font-semibold"
                                        value={el.fillType || 'solid'}
                                        onChange={(e) => onUpdate(id, { fillType: e.target.value as 'solid' | 'gradient' })}
                                    >
                                        <option value="solid">Solid</option>
                                        <option value="gradient">Gradient</option>
                                    </SelectInput>
                                    <Toggle
                                        checked={fillEnabled}
                                        onCheckedChange={(checked) => onUpdate(id, { fillEnabled: checked })}
                                        aria-label="Toggle fill"
                                    />
                                </div>
                            }
                        >
                            <div className={`space-y-3 ${fillEnabled ? '' : 'opacity-40 pointer-events-none'}`}>
                                {el.fillType === 'gradient' ? (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <span className="w-16 text-[10px] font-bold uppercase text-zinc-400">Start</span>
                                            <ColorInput
                                                value={el.gradient?.start || el.color}
                                                onChange={(value) => onUpdate(id, { gradient: { ...(el.gradient || { end: el.color, angle: 90 }), start: value } })}
                                                swatchSize="sm"
                                                className="flex-1"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="w-16 text-[10px] font-bold uppercase text-zinc-400">End</span>
                                            <ColorInput
                                                value={el.gradient?.end || el.color}
                                                onChange={(value) => onUpdate(id, { gradient: { ...(el.gradient || { start: el.color, angle: 90 }), end: value } })}
                                                swatchSize="sm"
                                                className="flex-1"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="w-16 text-[10px] font-bold uppercase text-zinc-400">Angle</span>
                                            <div className="flex-1">
                                                <ValueSlider
                                                    value={el.gradient?.angle ?? 90}
                                                    onChange={(value) => onUpdate(id, { gradient: { ...(el.gradient || { start: el.color, end: el.color }), angle: value } })}
                                                    min={0}
                                                    max={360}
                                                    step={1}
                                                    suffix="°"
                                                    numberInputProps={{ step: 1 }}
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <span className="w-16 text-[10px] font-bold uppercase text-zinc-400">Color</span>
                                        <ColorInput
                                            value={el.color}
                                            onChange={(value) => onUpdate(id, { color: value })}
                                            swatchSize="sm"
                                            className="flex-1"
                                        />
                                    </div>
                                )}
                            </div>
                        </SectionCard>
                    )}

                    <SectionCard
                        title="Outline"
                        collapsible
                        open={outlineSectionOpen}
                        onToggle={setOutlineSectionOpen}
                        actions={
                            <Toggle
                                checked={strokeEnabled}
                                onCheckedChange={(checked) => onUpdate(id, { strokeEnabled: checked })}
                                aria-label="Toggle outline"
                            />
                        }
                    >
                        <div className={`${strokeEnabled ? '' : 'opacity-40 pointer-events-none'} space-y-3`}>
                            <div className="flex items-center gap-3">
                                <span className="w-16 text-[10px] font-bold uppercase text-zinc-400">Color</span>
                                <ColorInput
                                    value={strokeColor}
                                    onChange={(value) => onUpdate(id, { strokeColor: value })}
                                    swatchSize="sm"
                                    className="flex-1"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-16 text-[10px] font-bold uppercase text-zinc-400">Width</span>
                                <div className="flex-1">
                                    <ValueSlider
                                        value={strokeWidthValue}
                                        onChange={handleStrokeWidthChange}
                                        min={0}
                                        max={40}
                                        step={0.5}
                                        format={(val) => val.toFixed(1)}
                                        parse={(val) => parseFloat(val)}
                                        numberInputProps={{ step: 0.5, min: 0 }}
                                    />
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                </div>
            )}

            <SectionDivider />

            {/* Animations */}
            <SectionCard
                title={<span className="inline-flex items-center gap-2"><Activity size={14} className="text-zinc-500" /> Animations</span>}
                collapsible
                open={animationsOpen}
                onToggle={setAnimationsOpen}
                actions={
                    <Button
                        size="sm"
                        onClick={() => {
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
                        }}
                    >
                        + Add Track
                    </Button>
                }
            >
                {animationsOpen && (
                <div className="flex flex-col gap-4">
                    {el.animationTracks.map((track, idx) => (
                        <div key={track.id} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 border border-zinc-200 dark:border-zinc-700 shadow-sm space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${track.enabled ? 'bg-green-500' : 'bg-zinc-300'}`}></div>
                                    <SelectInput
                                        size="xs"
                                        block={false}
                                        className="w-32 font-bold"
                                        value={track.target}
                                        onChange={(e) => {
                                            const newTarget = e.target.value as AnimationTarget;
                                            let defVal: string | number = 1.5;
                                            if(newTarget === 'x' || newTarget === 'y') defVal = 0.2;
                                            if(newTarget === 'rotation') defVal = 180;
                                            if(newTarget === 'layer') defVal = 'front';
                                            if(newTarget === 'color') defVal = el.color;
                                            
                                            const updatedTracks = el.animationTracks.map((t, i) => {
                                                if (i !== idx) return t;
                                                const updatedKeyframes = t.keyframes.map(k => ({...k, value: defVal}));
                                                return { ...t, target: newTarget, keyframes: updatedKeyframes };
                                            });

                                            onUpdate(id, { animationTracks: updatedTracks });
                                        }}
                                    >
                                        <option value="scale">Scale</option>
                                        <option value="opacity">Opacity</option>
                                        <option value="rotation">Rotation</option>
                                        <option value="x">Pos X</option>
                                        <option value="y">Pos Y</option>
                                        <option value="color">Color</option>
                                        <option value="layer">Layer (Z-Index)</option>
                                    </SelectInput>
                                </div>
                                <IconButton
                                    tone="danger"
                                    aria-label="Remove track"
                                    onClick={() => {
                                        const updatedTracks = el.animationTracks.filter((_, i) => i !== idx);
                                        onUpdate(id, { animationTracks: updatedTracks });
                                    }}
                                >
                                    <X size={12}/>
                                </IconButton>
                            </div>

                            <div className="flex items-center gap-2">
                                <SelectInput
                                    size="xs"
                                    value={track.driver}
                                    onChange={(e) => {
                                        const updatedTracks = el.animationTracks.map((t, i) => i === idx ? { ...t, driver: e.target.value as AnimationDriver } : t);
                                        onUpdate(id, { animationTracks: updatedTracks });
                                    }}
                                >
                                    <option value="audio">Audio React</option>
                                    <option value="time">Loop (Time)</option>
                                </SelectInput>
                                {track.driver === 'time' && (
                                    <NumberInput
                                        size="xs"
                                        block={false}
                                        className="w-20"
                                        value={track.duration}
                                        onChange={(e) => {
                                            const updatedTracks = el.animationTracks.map((t, i) => i === idx ? { ...t, duration: parseFloat(e.target.value) } : t);
                                            onUpdate(id, { animationTracks: updatedTracks });
                                        }}
                                    />
                                )}
                            </div>

                            {track.driver === 'audio' && (
                                <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700/50 space-y-2">
                                    <div className="flex justify-between text-[9px] text-zinc-400 uppercase font-bold">
                                        <span>Range</span>
                                        <span>0Hz - 22kHz</span>
                                    </div>
                                    <div className="h-2 bg-zinc-300 dark:bg-zinc-700 rounded-full relative overflow-hidden">
                                        <div className="absolute top-0 bottom-0 bg-blue-500 opacity-50" style={{ left: `${track.frequencyRange[0]*100}%`, width: `${(track.frequencyRange[1]-track.frequencyRange[0])*100}%` }}></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <FormField label="Min Hz" gap="sm">
                                            <NumberInput
                                                size="xs"
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
                                        </FormField>
                                        <FormField label="Max Hz" gap="sm">
                                            <NumberInput
                                                size="xs"
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
                                        </FormField>
                                    </div>
                                </div>
                            )}

                            <div className="mt-2">
                                <div className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Timeline</div>
                                <div 
                                    className="h-6 relative flex items-center cursor-pointer group/timeline"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const pct = (e.clientX - rect.left) / rect.width;
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
                                    {track.keyframes.map((kf) => (
                                        <div 
                                            key={kf.id}
                                            className="absolute w-3 h-3 bg-zinc-900 dark:bg-zinc-100 border border-white dark:border-zinc-900 rounded-full shadow-sm"
                                            style={{ left: `calc(${kf.offset * 100}% - 6px)` }}
                                            title={`Offset: ${(kf.offset * 100).toFixed(0)}%`}
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-zinc-400 font-bold uppercase px-1">
                                    <span>Value</span>
                                    <span>Offset</span>
                                </div>
                                {track.keyframes.map((kf, kfIdx) => {
                                    const isTime = track.driver === 'time';
                                    const displayVal = isTime ? Math.round(kf.offset * track.duration) : Math.round(kf.offset * 100);
                                    const unit = isTime ? 'ms' : '%';
                                    const maxVal = isTime ? track.duration : 100;
                                    const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                                    };

                                    const handleValueChange = (value: number | string) => {
                                        const updatedTracks = el.animationTracks.map((t, i) => {
                                            if (i !== idx) return t;
                                            const newKeyframes = t.keyframes.map((k, ki) => {
                                                if (ki !== kfIdx) return k;
                                                return { ...k, value };
                                            });
                                            return { ...t, keyframes: newKeyframes };
                                        });
                                        onUpdate(id, { animationTracks: updatedTracks });
                                    };

                                    return (
                                        <div key={kf.id} className="flex items-center justify-between gap-2">
                                            <div className="flex-1 min-w-0 flex justify-start">
                                                {track.target === 'color' ? (
                                                    <ColorInput
                                                        value={String(kf.value)}
                                                        className="w-full"
                                                        swatchSize="sm"
                                                        inputProps={{ size: 'xs', className: 'w-20 text-left font-mono uppercase' }}
                                                        onChange={(hex) => handleValueChange(hex)}
                                                    />
                                                ) : track.target === 'layer' ? (
                                                    <SelectInput
                                                        size="xs"
                                                        value={String(kf.value)}
                                                        onChange={(e) => handleValueChange(e.target.value)}
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
                                                    </SelectInput>
                                                ) : (
                                                    <NumberInput
                                                        size="xs"
                                                        block={false}
                                                        className="w-16"
                                                        step={0.1}
                                                        value={typeof kf.value === 'number' ? kf.value : 0}
                                                        onChange={(e) => {
                                                            const next = parseFloat(e.target.value);
                                                            handleValueChange(Number.isNaN(next) ? 0 : next);
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            
                                            <ArrowRight size={12} className="text-zinc-300 dark:text-zinc-600 shrink-0" />

                                            <div className="relative w-16 shrink-0">
                                                <NumberInput
                                                    size="xs"
                                                    className="pr-5 text-right"
                                                    value={displayVal}
                                                    onChange={handleOffsetChange}
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
                )}
            </SectionCard>
        </div>
    </div>
  );
};

export default WorkspaceProperties;
