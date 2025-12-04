import React, { useState, useRef, useEffect } from 'react';
import { VisualizerElement, ElementType, DragMode, SelectionBox, Alignment } from '../types';
import { hexToHSL, generateMergedElement, generateSubtractedElement, isFillActive, isStrokeActive } from './workspace/utils';
import WorkspaceHeader from './workspace/WorkspaceHeader';
import WorkspaceLayers from './workspace/WorkspaceLayers';
import WorkspaceFooter from './workspace/WorkspaceFooter';
import WorkspaceProperties from './workspace/WorkspaceProperties';
import WorkspaceCanvas from './workspace/WorkspaceCanvas';
import ContextMenu from './workspace/ContextMenu';
import useHistoryManager from './workspace/hooks/useHistoryManager';
import useAudioEngine from './workspace/hooks/useAudioEngine';
import { findElementById, updateElementInList, removeElementFromList, moveElementRelative, changeElementLayer, findElementPath, LayerShift } from './workspace/elementTree';
import { interpolateKeyframes } from './workspace/animation';

interface WorkspaceProps {
  onClose: () => void;
  isDarkMode: boolean;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

interface EditPointTarget {
    elementId: string;
    pointIndex: number;
    type: 'anchor' | 'in' | 'out';
}

const SPLINE_CLOSE_DISTANCE = 12;
type LayerAction = 'bring-forward' | 'send-backward' | 'bring-to-front' | 'send-to-back';

const comparePaths = (a: number[], b: number[]) => {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
};

const Workspace: React.FC<WorkspaceProps> = ({ onClose, isDarkMode }) => {
  const {
    elements,
    setElements,
    pushHistory,
    undo,
    redo,
    historyLength,
    redoStackLength
  } = useHistoryManager();
  const {
    isPlaying,
    setIsPlaying,
    sourceType,
    setSourceType,
    volume,
    setVolume,
    trackTitle,
    analyserRef,
    handleTabShare,
    handleFileUpload
  } = useAudioEngine();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<VisualizerElement | null>(null);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
  const [toolMode, setToolMode] = useState<'pointer' | 'shape' | 'freeform' | 'spline'>('pointer');
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  
  // Selection Box State
  const [selectionBox, setSelectionBox] = useState<SelectionBox>({ startX: 0, startY: 0, currentX: 0, currentY: 0, visible: false });

  // Interaction Refs
  const dragMode = useRef<DragMode>(null);
  const isDrawing = useRef(false);
  const drawingId = useRef<string | null>(null);
  const activeSplineId = useRef<string | null>(null);
  const editPointTarget = useRef<EditPointTarget | null>(null);

  const startPos = useRef({ x: 0, y: 0 });
  const startEls = useRef<Map<string, VisualizerElement>>(new Map());
  const svgRef = useRef<SVGSVGElement>(null);
  const elementRefs = useRef<Map<string, SVGElement>>(new Map());
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panOffsetRef = useRef({ x: 0, y: 0 });

  const animationFrameRef = useRef<number>(0);

  const maybeSnapSplineEndpoints = (points: VisualizerElement['points'], movedIndex: number) => {
    if (!points || points.length < 2) return false;
    const lastIndex = points.length - 1;
    if (movedIndex !== 0 && movedIndex !== lastIndex) return false;
    const otherIndex = movedIndex === 0 ? lastIndex : 0;
    const moved = points[movedIndex];
    const other = points[otherIndex];
    if (!moved || !other) return false;
    const dist = Math.hypot(moved.x - other.x, moved.y - other.y);
    if (dist <= SPLINE_CLOSE_DISTANCE) {
        points[movedIndex] = { ...moved, x: other.x, y: other.y };
        return true;
    }
    return false;
  };

  const normalizeSpline = (id: string, list: VisualizerElement[]) => {
    const el = findElementById(id, list);
    if (!el || !el.points || el.points.length === 0) return list;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    el.points.forEach(p => {
       minX = Math.min(minX, p.x + Math.min(0, p.handleIn?.x||0, p.handleOut?.x||0));
       maxX = Math.max(maxX, p.x + Math.max(0, p.handleIn?.x||0, p.handleOut?.x||0));
       minY = Math.min(minY, p.y + Math.min(0, p.handleIn?.y||0, p.handleOut?.y||0));
       maxY = Math.max(maxY, p.y + Math.max(0, p.handleIn?.y||0, p.handleOut?.y||0));
    });

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;
    
    // Normalize points relative to center (0,0)
    const newPoints = el.points.map(p => ({
        x: p.x - centerX,
        y: p.y - centerY,
        handleIn: p.handleIn,
        handleOut: p.handleOut
    }));

    const svgRect = svgRef.current?.getBoundingClientRect() || {width: 1000, height: 600};
    const xPct = centerX / svgRect.width;
    const yPct = centerY / svgRect.height;

    return updateElementInList(list, id, {
        x: xPct, y: yPct, width, height, points: newPoints
    });
  };

  const finishSpline = () => {
    if (!activeSplineId.current) return;
    const normalized = normalizeSpline(activeSplineId.current, elements);
    pushHistory(normalized);
    activeSplineId.current = null;
  };

  const handleSaveProject = () => {
    const project = { name: projectName, elements, version: '1.0' };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = reader.result;
        if (typeof content === 'string') {
           const project = JSON.parse(content) as any;
           if (project.elements) {
             pushHistory(project.elements);
             if (project.name) setProjectName(project.name);
             setSelectedIds(new Set());
           }
        }
      } catch (err) { alert("Invalid project file"); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };


  useEffect(() => {
    const loop = () => {
      // ... (Audio data fetch)
      let dataArray: Uint8Array | null = null;
      let bufferLength = 0;
      if (analyserRef.current) {
        bufferLength = analyserRef.current.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
      }
      const now = performance.now();
      
      const processElement = (el: VisualizerElement) => {
         const innerNode = elementRefs.current.get(el.id);
         if (el.children) el.children.forEach(processElement);
         if (!innerNode) return;

         const wrapper = innerNode.parentNode as HTMLElement;

         const baseHSL = hexToHSL(el.color);
         let scale = 1, opacity = el.opacity, rot = el.rotation, xOff = 0, yOff = 0;
         let widthMult = 1, heightMult = 1, hueMod = 0, satMod = 0, lightMod = 0;
         let layerCommand: string | null = null;
         let colorOverride: string | null = null;

         el.animationTracks.forEach(track => {
             if (!track.enabled) return;
             let driverValue = 0;
             if (track.driver === 'time') {
                 driverValue = (now % track.duration) / track.duration;
             } else if (track.driver === 'audio' && dataArray) {
                 const startBin = Math.floor(track.frequencyRange[0] * bufferLength);
                 const endBin = Math.floor(track.frequencyRange[1] * bufferLength);
                 const safeEnd = Math.max(startBin + 1, Math.min(endBin, bufferLength));
                 let sum = 0;
                 for (let k = startBin; k < safeEnd; k++) sum += dataArray[k];
                 driverValue = (sum / (safeEnd - startBin)) / 255;
             }
             
             const output = interpolateKeyframes(track.keyframes, driverValue);
             
             if (track.target === 'layer') {
                 layerCommand = String(output);
             } else if (track.target === 'color') {
                 colorOverride = String(output);
             } else if (typeof output === 'number') {
                switch(track.target) {
                    case 'scale': scale *= output; break;
                    case 'opacity': opacity *= output; break;
                    case 'rotation': rot += output; break; 
                    case 'x': xOff += output; break;
                    case 'y': yOff += output; break;
                    case 'width': widthMult *= output; break;
                    case 'height': heightMult *= output; break;
                    case 'hue': hueMod += output; break;
                    case 'saturation': satMod += output; break;
                    case 'lightness': lightMod += output; break;
                }
             }
         });

         const svgW = svgRef.current?.clientWidth || 1000;
         const svgH = svgRef.current?.clientHeight || 600;
         
         if (wrapper) {
             wrapper.style.transform = `translate(${xOff * svgW}px, ${yOff * svgH}px) rotate(${rot}deg) scale(${scale}, ${scale})`;
             if (widthMult !== 1 || heightMult !== 1) wrapper.style.transform += ` scale(${widthMult}, ${heightMult})`;
         }
         
         innerNode.style.opacity = `${Math.min(1, Math.max(0, opacity))}`;
         
         let colorString = '';
         if (colorOverride) {
             colorString = colorOverride;
         } else {
             const finalH = (baseHSL.h + hueMod) % 360;
             const finalS = Math.min(100, Math.max(0, baseHSL.s + satMod));
             const finalL = Math.min(100, Math.max(0, baseHSL.l + lightMod));
             colorString = `hsl(${finalH}, ${finalS}%, ${finalL}%)`;
         }
         
         // Apply Color (If Gradient, we don't apply fill color unless overridden by animation, usually gradients are static in appearance)
         // But if animating 'color' target, we override the fill.
         const strokeActive = isStrokeActive(el);
         const strokeColorString = el.strokeColor ? el.strokeColor : colorString;
         if (strokeActive) innerNode.style.stroke = strokeColorString;
         else innerNode.style.stroke = 'none';

         if (el.type === 'custom') {
             innerNode.style.color = colorString;
         } else if (el.type !== 'group') {
             const fillActive = isFillActive(el);
             if (fillActive) {
                 if (el.fillType !== 'gradient' || colorOverride) innerNode.style.fill = colorString;
                 else innerNode.style.fill = '';
                 innerNode.style.color = colorString;
             } else {
                 innerNode.style.fill = 'none';
             }
         }

         // Handle Layer Animation (Direct DOM Manipulation)
         if (layerCommand && wrapper && wrapper.parentNode) {
             const container = wrapper.parentNode as Element;
             if (layerCommand === 'front') {
                 if (container.lastElementChild !== wrapper) container.appendChild(wrapper);
             } else if (layerCommand === 'back') {
                 if (container.firstElementChild !== wrapper) container.prepend(wrapper);
             } else if (layerCommand.startsWith('before:')) {
                 const targetId = layerCommand.split(':')[1];
                 const targetInner = elementRefs.current.get(targetId);
                 const targetWrapper = targetInner?.parentNode as Node | null;
                 if (targetWrapper && targetWrapper.parentNode === container && wrapper.nextSibling !== targetWrapper) container.insertBefore(wrapper, targetWrapper);
             } else if (layerCommand.startsWith('after:')) {
                const targetId = layerCommand.split(':')[1];
                const targetInner = elementRefs.current.get(targetId);
                const targetWrapper = targetInner?.parentNode as Node | null;
                if (targetWrapper && targetWrapper.parentNode === container && wrapper.previousSibling !== targetWrapper) container.insertBefore(wrapper, targetWrapper.nextSibling);
             }
         }
      };
      
      elements.forEach(processElement);
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [elements]);

  // --- CRUD Operations ---
  const addElement = (type: ElementType) => {
    finishSpline();
    const baseColor = '#3b82f6';
    const isLine = type === 'line';
    const isFreeform = type === 'freeform';
    const isSplineType = type === 'spline';
    const isPathLike = isLine || isFreeform || isSplineType;
    const defaultFillEnabled = type === 'group' ? false : (!isLine && !isFreeform && !isSplineType);
    const defaultStrokeEnabled = type === 'group' ? false : isPathLike;
    const newEl: VisualizerElement = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
      x: 0.5, y: 0.5,
      width: 100, height: isLine ? 4 : 100,
      color: baseColor, 
      fillType: 'solid',
      gradient: { start: baseColor, end: baseColor, angle: 90 },
      fillEnabled: defaultFillEnabled,
      strokeEnabled: defaultStrokeEnabled,
      strokeColor: baseColor,
      strokeWidth: isLine ? 4 : 2,
      rotation: 0,
      opacity: 1,
      animationTracks: [],
      children: type === 'group' ? [] : undefined
    };
    pushHistory([...elements, newEl]);
    setSelectedIds(new Set([newEl.id]));
  };

  const handleSVGUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const text = reader.result;
        if (typeof text === 'string') {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'image/svg+xml');
                const svgEl = doc.querySelector('svg');
                if (!svgEl) { alert("Invalid SVG file"); return; }
                const viewBox = svgEl.getAttribute('viewBox') || '0 0 100 100';
                const innerContent = svgEl.innerHTML;
                const newEl: VisualizerElement = {
                    id: Math.random().toString(36).substring(2, 11),
                    type: 'custom',
                    name: file.name.replace('.svg', ''),
                    x: 0.5, y: 0.5,
                    width: 100, height: 100,
                    color: '#3b82f6',
                    fillType: 'solid',
                    gradient: { start: '#3b82f6', end: '#3b82f6', angle: 90 },
                    fillEnabled: true,
                    strokeEnabled: false,
                    strokeColor: '#3b82f6',
                    strokeWidth: 2,
                    rotation: 0,
                    opacity: 1,
                    animationTracks: [],
                    svgContent: innerContent,
                    viewBox
                };
                pushHistory([...elements, newEl]);
                setSelectedIds(new Set([newEl.id]));
            } catch (err) { console.error("Failed to parse SVG", err); }
        }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const deleteSelected = () => {
    if(selectedIds.size === 0) return;
    let newElements = [...elements];
    selectedIds.forEach(id => { newElements = removeElementFromList(newElements, id); });
    pushHistory(newElements);
    setSelectedIds(new Set());
    activeSplineId.current = null;
  };

  const handleGroup = () => {
    if (selectedIds.size < 2) return;
    finishSpline();
    const selectedEls: VisualizerElement[] = [];
    const remainingEls: VisualizerElement[] = [];
    elements.forEach(el => {
        if (selectedIds.has(el.id)) selectedEls.push(el);
        else remainingEls.push(el);
    });
    if (selectedEls.length === 0) return;

    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    selectedEls.forEach(el => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x);
        maxY = Math.max(maxY, el.y);
    });
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const children = selectedEls.map(el => ({ ...el, x: el.x - centerX, y: el.y - centerY }));

    const groupEl: VisualizerElement = {
        id: Math.random().toString(36).substring(2, 11),
        type: 'group',
        name: 'Group',
        x: centerX, y: centerY, width: 100, height: 100, 
        color: '#ffffff', 
        fillType: 'solid',
        gradient: { start: '#ffffff', end: '#ffffff', angle: 90 },
        fillEnabled: false,
        strokeEnabled: false,
        strokeColor: '#ffffff',
        strokeWidth: 2,
        rotation: 0, opacity: 1, animationTracks: [], children
    };
    pushHistory([...remainingEls, groupEl]);
    setSelectedIds(new Set([groupEl.id]));
  };

  const handleMerge = () => {
    if (selectedIds.size < 2 || !svgRef.current) return;
    finishSpline();
    
    // Collect selected elements from top-level list
    const selectedEls: VisualizerElement[] = [];
    const remainingEls: VisualizerElement[] = [];
    elements.forEach(el => {
        if (selectedIds.has(el.id)) selectedEls.push(el);
        else remainingEls.push(el);
    });
    
    if (selectedEls.length < 2) return;

    const rect = svgRef.current.getBoundingClientRect();
    const mergedEl = generateMergedElement(selectedEls, rect.width, rect.height);
    
    if (mergedEl) {
        pushHistory([...remainingEls, mergedEl]);
        setSelectedIds(new Set([mergedEl.id]));
    }
  };

  const handleSubtract = () => {
    if (selectedIds.size < 2 || !svgRef.current) return;
    finishSpline();
    
    const selectedEls: VisualizerElement[] = [];
    const remainingEls: VisualizerElement[] = [];

    // 'elements' is in draw order (bottom to top)
    elements.forEach(el => {
        if (selectedIds.has(el.id)) selectedEls.push(el);
        else remainingEls.push(el);
    });

    if (selectedEls.length < 2) return;

    const rect = svgRef.current.getBoundingClientRect();
    const subtractedEl = generateSubtractedElement(selectedEls, rect.width, rect.height);

    if (subtractedEl) {
        pushHistory([...remainingEls, subtractedEl]);
        setSelectedIds(new Set([subtractedEl.id]));
    }
  };

  const handleUngroup = () => {
      if (selectedIds.size !== 1) return;
      const id = Array.from(selectedIds)[0] as string;
      const group = elements.find(e => e.id === id);
      if (!group || group.type !== 'group' || !group.children) return;
      const unpacked = group.children.map(child => ({
          ...child, x: group.x + child.x, y: group.y + child.y, rotation: group.rotation + child.rotation 
      }));
      pushHistory([...elements.filter(e => e.id !== id), ...unpacked]);
      setSelectedIds(new Set(unpacked.map(e => e.id)));
  };

  const handleAlign = (alignment: Alignment) => {
    if (selectedIds.size < 2 || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgW = rect.width;
    const svgH = rect.height;

    // Helper to traverse and collect currently selected items
    const selectedEls: VisualizerElement[] = [];
    const collect = (list: VisualizerElement[]) => list.forEach(el => {
        if (selectedIds.has(el.id)) selectedEls.push(el);
        if (el.children) collect(el.children);
    });
    collect(elements);

    if (selectedEls.length < 2) return;

    // Calculate bounds of the selection
    let minL = Infinity, maxR = -Infinity, minT = Infinity, maxB = -Infinity;
    selectedEls.forEach(el => {
        const px = el.x * svgW;
        const py = el.y * svgH;
        const halfW = el.width / 2;
        const halfH = el.height / 2;
        minL = Math.min(minL, px - halfW);
        maxR = Math.max(maxR, px + halfW);
        minT = Math.min(minT, py - halfH);
        maxB = Math.max(maxB, py + halfH);
    });

    const midX = (minL + maxR) / 2;
    const midY = (minT + maxB) / 2;

    const updateList = (list: VisualizerElement[]): VisualizerElement[] => {
        return list.map(el => {
            if (selectedIds.has(el.id)) {
                let newX = el.x;
                let newY = el.y;
                const px = el.x * svgW;
                const py = el.y * svgH;
                const halfW = el.width / 2;
                const halfH = el.height / 2;

                switch (alignment) {
                    case 'left': newX = (minL + halfW) / svgW; break;
                    case 'center': newX = midX / svgW; break;
                    case 'right': newX = (maxR - halfW) / svgW; break;
                    case 'top': newY = (minT + halfH) / svgH; break;
                    case 'middle': newY = midY / svgH; break;
                    case 'bottom': newY = (maxB - halfH) / svgH; break;
                }
                
                const updated = { ...el, x: newX, y: newY };
                if (el.children) return { ...updated, children: updateList(el.children) };
                return updated;
            }
            if (el.children) return { ...el, children: updateList(el.children) };
            return el;
        });
    };

    pushHistory(updateList(elements));
  };

  const handleLayerAction = (action: LayerAction) => {
    if (selectedIds.size === 0) return;
    const selectionWithPaths = Array.from(selectedIds)
      .map(id => {
        const path = findElementPath(elements, id);
        return path ? { id, path } : null;
      })
      .filter((entry): entry is { id: string; path: number[] } => !!entry);

    if (selectionWithPaths.length === 0) return;

    const sorted = [...selectionWithPaths].sort((a, b) => comparePaths(a.path, b.path));
    const actionConfig: Record<LayerAction, { direction: LayerShift; order: 'asc' | 'desc' }> = {
      'bring-to-front': { direction: 'front', order: 'asc' },
      'send-to-back': { direction: 'back', order: 'desc' },
      'bring-forward': { direction: 'forward', order: 'desc' },
      'send-backward': { direction: 'backward', order: 'asc' }
    };

    const { direction, order } = actionConfig[action];
    const orderedEntries = order === 'asc' ? sorted : [...sorted].reverse();

    let updated = elements;
    orderedEntries.forEach(({ id }) => {
      updated = changeElementLayer(updated, id, direction);
    });

    if (updated !== elements) pushHistory(updated);
  };

  const handleLayerReorder = (sourceId: string, targetId: string, position: 'before' | 'after') => {
    const reordered = moveElementRelative(elements, sourceId, targetId, position);
    if (reordered !== elements) pushHistory(reordered);
  };

  const addSplinePoint = (elId: string, pointIndex: number, newPoint: {x: number, y: number}) => {
      setElements(prev => updateElementInList(prev, elId, {
          points: [
              ...(findElementById(elId, prev)?.points?.slice(0, pointIndex + 1) || []),
              newPoint,
              ...(findElementById(elId, prev)?.points?.slice(pointIndex + 1) || [])
          ]
      }));
  };

  const deleteSplinePoint = (elId: string, pointIndex: number) => {
      const el = findElementById(elId, elements);
      if(!el || !el.points || el.points.length <= 2) return;
      const newPoints = el.points.filter((_, i) => i !== pointIndex);
      setElements(prev => updateElementInList(prev, elId, { points: newPoints }));
  };

  const resumeSplineEditing = () => {
      if (selectedIds.size !== 1) return;
      const id = Array.from(selectedIds)[0] as string;
      const el = findElementById(id, elements);
      if (el && el.type === 'spline') {
          activeSplineId.current = id;
          setToolMode('spline');
          setSelectedIds(new Set()); 
      }
  };

  const removeLastSplinePoint = () => {
      if (selectedIds.size !== 1) return;
      const id = Array.from(selectedIds)[0] as string;
      const el = findElementById(id, elements);
      if (el && el.type === 'spline' && el.points && el.points.length > 0) {
          const newPoints = el.points.slice(0, el.points.length - 1);
          if (newPoints.length === 0) {
              const newEls = removeElementFromList(elements, id);
              pushHistory(newEls);
              setSelectedIds(new Set());
          } else {
               const newEls = updateElementInList(elements, id, { points: newPoints });
               pushHistory(newEls);
          }
      }
  };

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
        if (e.code === 'Space') {
            e.preventDefault();
            setIsSpacePressed(true);
            return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
        if (e.key === 'Escape') {
            if (toolMode === 'spline') { finishSpline(); setToolMode('pointer'); }
            else setSelectedIds(new Set());
            setContextMenu(prev => ({ ...prev, visible: false }));
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedIds.size > 0) {
           const lastId = Array.from(selectedIds).pop() as string;
           if(lastId) { const el = findElementById(lastId, elements); if (el) setClipboard(el); }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard) {
            finishSpline();
            const newEl = { 
                ...clipboard, id: Math.random().toString(36).substring(2, 11), 
                x: clipboard.x + 0.03, y: clipboard.y + 0.03, name: `${clipboard.name} Copy`,
                animationTracks: clipboard.animationTracks.map(t => ({...t, keyframes: [...t.keyframes]}))
            };
            pushHistory([...elements, newEl]);
            setSelectedIds(new Set([newEl.id]));
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') e.shiftKey ? redo() : undo();
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') redo();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, clipboard, elements, historyLength, redoStackLength, toolMode]);

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, []);

  useEffect(() => {
    if (!isSpacePressed && dragMode.current === 'pan') {
        dragMode.current = null;
        panStartRef.current = null;
        setIsPanning(false);
    }
  }, [isSpacePressed]);

  const handleContextMenu = (e: React.MouseEvent, id?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (id && !selectedIds.has(id)) setSelectedIds(new Set([id]));
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  const handleSVGMouseDown = (e: React.MouseEvent, mode: DragMode, id?: string) => {
    if (e.button === 0) {
        e.stopPropagation();
        setContextMenu(prev => ({ ...prev, visible: false }));

        if (isSpacePressed) {
            dragMode.current = 'pan';
            panStartRef.current = { x: e.clientX, y: e.clientY };
            panOffsetRef.current = { ...canvasOffset };
            setIsPanning(true);
            return;
        }
        
        if (mode === 'edit-point' || mode === 'edit-handle-in' || mode === 'edit-handle-out') {
             dragMode.current = mode;
             startPos.current = { x: e.clientX, y: e.clientY };
             return;
        }

        if (toolMode === 'freeform' && svgRef.current) {
            isDrawing.current = true;
            const rect = svgRef.current.getBoundingClientRect();
            const newEl: VisualizerElement = {
                id: Math.random().toString(36).substring(2, 11),
                type: 'freeform', name: 'Freeform Line',
                x: 0, y: 0, width: 100, height: 100, color: '#3b82f6', 
                fillType: 'solid', gradient: { start: '#3b82f6', end: '#3b82f6', angle: 90 },
                fillEnabled: false,
                strokeEnabled: true,
                strokeColor: '#3b82f6',
                strokeWidth: 2,
                rotation: 0, opacity: 1, animationTracks: [],
                points: [{x: e.clientX - rect.left, y: e.clientY - rect.top}]
            };
            drawingId.current = newEl.id;
            setElements(prev => [...prev, newEl]);
            return;
        }
        if (toolMode === 'spline' && svgRef.current) {
             const rect = svgRef.current.getBoundingClientRect();
             const x = e.clientX - rect.left;
             const y = e.clientY - rect.top;
             if (!activeSplineId.current) {
                 const newEl: VisualizerElement = {
                     id: Math.random().toString(36).substring(2, 11),
                     type: 'spline', name: 'Spline Curve',
                     x: 0, y: 0, width: 100, height: 100, color: '#3b82f6', 
                     fillType: 'solid', gradient: { start: '#3b82f6', end: '#3b82f6', angle: 90 },
                     fillEnabled: false,
                     strokeEnabled: true,
                     strokeColor: '#3b82f6',
                     strokeWidth: 2,
                     rotation: 0, opacity: 1, animationTracks: [], isClosed: false,
                     points: [{x, y, handleIn: {x:0, y:0}, handleOut: {x:0, y:0}}]
                 };
                 activeSplineId.current = newEl.id;
                 setElements(prev => [...prev, newEl]);
                 setSelectedIds(new Set([newEl.id]));
             } else {
                 let closedBySnap = false;
                 setElements(prev => {
                     const el = findElementById(activeSplineId.current!, prev);
                     if (!el) return prev;
                     if (el.isClosed) { closedBySnap = true; return prev; }
                     const existingPoints = el.points || [];
                     if (existingPoints.length >= 2) {
                         const first = existingPoints[0];
                         const dist = Math.hypot(x - first.x, y - first.y);
                         if (dist <= SPLINE_CLOSE_DISTANCE) {
                             closedBySnap = true;
                             return updateElementInList(prev, el.id, { isClosed: true });
                         }
                     }
                     const newPoints = [...existingPoints, { x, y, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } }];
                     return updateElementInList(prev, el.id, { points: newPoints });
                 });
                 if (closedBySnap) {
                     dragMode.current = null;
                     return;
                 }
             }
             dragMode.current = 'create-tangent';
             startPos.current = { x: e.clientX, y: e.clientY };
             return;
        }

        if (!id && !mode) {
            // Background Click
            if (toolMode === 'pointer') { 
                finishSpline(); 
                setContextMenu(prev => ({ ...prev, visible: false }));
                
                // Start Marquee Selection if SVG available
                if (svgRef.current) {
                    const rect = svgRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y, visible: true });
                    dragMode.current = 'marquee';
                    
                    // Standard behavior: clear selection unless Shift is held (Additive)
                    if (!e.shiftKey) {
                        setSelectedIds(new Set());
                    }
                }
            }
            return;
        }
        
        if (id) {
            if (toolMode === 'pointer' && (e.ctrlKey || e.metaKey)) { /* toggle selection logic handled below via Shift checks */ }
            
            // Standard Multi-select Logic
            if (e.shiftKey) {
                const newSet = new Set(selectedIds);
                if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
                setSelectedIds(newSet);
            } else { 
                if (!selectedIds.has(id)) setSelectedIds(new Set([id])); 
            }
            
            startEls.current.clear();
            const allElements: VisualizerElement[] = [];
            const collect = (list: VisualizerElement[]) => list.forEach(x => { allElements.push(x); if(x.children) collect(x.children); });
            collect(elements);
            
            // Drag Start Snapshots
            (selectedIds.has(id) && !e.shiftKey ? selectedIds : new Set([id])).forEach(selId => {
                const el = allElements.find(x => x.id === selId);
                if (el) startEls.current.set(selId, { ...el });
            });
        }
        dragMode.current = mode;
        startPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragMode.current === 'pan' && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setCanvasOffset({ x: panOffsetRef.current.x + dx, y: panOffsetRef.current.y + dy });
        return;
    }
    // Marquee Drag
    if (dragMode.current === 'marquee' && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        setSelectionBox(prev => ({ ...prev, currentX, currentY }));
        return;
    }

    if (toolMode === 'freeform' && isDrawing.current && drawingId.current && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setElements(prev => prev.map(el => el.id === drawingId.current ? { ...el, points: [...(el.points || []), {x: e.clientX - rect.left, y: e.clientY - rect.top}] } : el));
        return;
    }
    if (dragMode.current === 'create-tangent' && activeSplineId.current) {
         const dx = e.clientX - startPos.current.x;
         const dy = e.clientY - startPos.current.y;
         setElements(prev => {
             const el = findElementById(activeSplineId.current!, prev);
             if (!el || !el.points) return prev;
             const newPoints = [...el.points];
             const lastIdx = newPoints.length - 1;
             newPoints[lastIdx] = { ...newPoints[lastIdx], handleOut: { x: dx, y: dy }, handleIn: { x: -dx, y: -dy } };
             return updateElementInList(prev, activeSplineId.current!, { points: newPoints });
         });
         return;
    }
    if ((dragMode.current === 'edit-point' || dragMode.current === 'edit-handle-in' || dragMode.current === 'edit-handle-out') && editPointTarget.current) {
        const { elementId, pointIndex, type } = editPointTarget.current;
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;
        startPos.current = { x: e.clientX, y: e.clientY };
        setElements(prev => {
             const el = findElementById(elementId, prev);
             if (!el || !el.points) return prev;
             const newPoints = [...el.points];
             const p = newPoints[pointIndex];
             let closedBySnap = false;
             if (type === 'anchor') {
                 newPoints[pointIndex] = { ...p, x: p.x + dx, y: p.y + dy };
                 if (!el.isClosed) {
                     closedBySnap = maybeSnapSplineEndpoints(newPoints, pointIndex);
                 }
             }
             else if (type === 'out') {
                 newPoints[pointIndex] = { ...p, handleOut: { x: (p.handleOut?.x||0) + dx, y: (p.handleOut?.y||0) + dy } };
                 if (!e.altKey) newPoints[pointIndex].handleIn = { x: -newPoints[pointIndex].handleOut!.x, y: -newPoints[pointIndex].handleOut!.y };
             } else if (type === 'in') {
                 newPoints[pointIndex] = { ...p, handleIn: { x: (p.handleIn?.x||0) + dx, y: (p.handleIn?.y||0) + dy } };
                 if (!e.altKey) newPoints[pointIndex].handleOut = { x: -newPoints[pointIndex].handleIn!.x, y: -newPoints[pointIndex].handleIn!.y };
             }
             const update: Partial<VisualizerElement> = { points: newPoints };
             if (closedBySnap) update.isClosed = true;
             return updateElementInList(prev, elementId, update);
        });
        return;
    }

    if (!dragMode.current || startEls.current.size === 0 || !svgRef.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const svgRect = svgRef.current.getBoundingClientRect();
    
    let newElements = [...elements];
    const updateTree = (list: VisualizerElement[], id: string, fn: (el: VisualizerElement) => Partial<VisualizerElement>): VisualizerElement[] => {
        return list.map(el => {
            if (el.id === id) return { ...el, ...fn(el) };
            if (el.children) return { ...el, children: updateTree(el.children, id, fn) };
            return el;
        });
    };

    startEls.current.forEach((start, id) => {
        if (dragMode.current === 'move') {
             newElements = updateTree(newElements, id, () => ({ x: start.x + dx / svgRect.width, y: start.y + dy / svgRect.height }));
        } else if (selectedIds.size === 1) {
             let updates = {};
             if (dragMode.current === 'resize-br') updates = { width: Math.max(10, start.width + dx), height: Math.max(10, start.height + dy) };
             else if (dragMode.current === 'resize-bl') updates = { x: start.x + dx / svgRect.width, width: Math.max(10, start.width - dx), height: Math.max(10, start.height + dy) };
             else if (dragMode.current === 'resize-tr') updates = { y: start.y + dy / svgRect.height, width: Math.max(10, start.width + dx), height: Math.max(10, start.height - dy) };
             else if (dragMode.current === 'resize-tl') updates = { x: start.x + dx / svgRect.width, y: start.y + dy / svgRect.height, width: Math.max(10, start.width - dx), height: Math.max(10, start.height - dy) };
             newElements = updateTree(newElements, id, () => updates);
        }
    });
    setElements(newElements);
  };

  const handleMouseUp = () => { 
      if (dragMode.current === 'pan') {
          dragMode.current = null;
          panStartRef.current = null;
          setIsPanning(false);
          return;
      }
      if (dragMode.current === 'marquee') {
          if (svgRef.current) {
              const rect = svgRef.current.getBoundingClientRect();
              const boxX = Math.min(selectionBox.startX, selectionBox.currentX);
              const boxY = Math.min(selectionBox.startY, selectionBox.currentY);
              const boxW = Math.abs(selectionBox.currentX - selectionBox.startX);
              const boxH = Math.abs(selectionBox.currentY - selectionBox.startY);
              
              // Start with current selection (if Shift was held/preserved), or empty (if cleared)
              const newSelected = new Set(selectedIds);
              
              const checkIntersection = (list: VisualizerElement[]) => {
                  list.forEach(el => {
                      const elX = el.x * rect.width;
                      const elY = el.y * rect.height;
                      // Simple point check for center
                      if (elX >= boxX && elX <= boxX + boxW && elY >= boxY && elY <= boxY + boxH) {
                          newSelected.add(el.id);
                      }
                      if (el.children) checkIntersection(el.children);
                  });
              };
              checkIntersection(elements);
              setSelectedIds(newSelected);
          }
          setSelectionBox(prev => ({ ...prev, visible: false }));
          dragMode.current = null;
          // No need to reset toolMode as it stays 'pointer'
          return;
      }

      if (toolMode === 'freeform' && isDrawing.current && drawingId.current && svgRef.current) {
          isDrawing.current = false;
          const normalizeEl = (el: VisualizerElement): VisualizerElement => {
              if (el.id === drawingId.current && el.points && el.points.length > 0) {
                  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                  el.points.forEach(p => { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; });
                  const width = maxX - minX; const height = maxY - minY;
                  const centerX = minX + width / 2; const centerY = minY + height / 2;
                  return {
                      ...el, x: centerX / svgRef.current!.getBoundingClientRect().width, y: centerY / svgRef.current!.getBoundingClientRect().height,
                      width: Math.max(10, width), height: Math.max(10, height), points: el.points.map(p => ({ x: p.x - centerX, y: p.y - centerY }))
                  };
              }
              return el;
          };
          const newElements = elements.map(normalizeEl);
          pushHistory(newElements);
          setSelectedIds(new Set([drawingId.current]));
          drawingId.current = null;
          setToolMode('pointer'); 
          return;
      }
      if (toolMode === 'spline' && dragMode.current === 'create-tangent') { dragMode.current = null; return; }
      if (dragMode.current && dragMode.current.startsWith('edit-')) { dragMode.current = null; editPointTarget.current = null; return; }
      dragMode.current = null; startEls.current.clear(); 
  };

  const handleSplinePointMouseDown = (e: React.MouseEvent, elId: string, idx: number, type: 'anchor' | 'in' | 'out') => {
      e.stopPropagation();
      if (type === 'anchor' && (e.ctrlKey || e.metaKey)) {
          deleteSplinePoint(elId, idx);
      } else {
          editPointTarget.current = { elementId: elId, pointIndex: idx, type };
          handleSVGMouseDown(e, type === 'anchor' ? 'edit-point' : type === 'in' ? 'edit-handle-in' : 'edit-handle-out', elId);
      }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      if (!isSpacePressed || !svgRef.current) return;
      e.preventDefault();
      const rect = svgRef.current.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      const delta = -e.deltaY * 0.001;
      setCanvasScale(prevScale => {
          const raw = prevScale * (1 + delta);
          const nextScale = Math.min(4, Math.max(0.25, raw));
          if (nextScale === prevScale) return prevScale;
          setCanvasOffset(prevOffset => {
              const scaleRatio = nextScale / prevScale;
              return {
                  x: prevOffset.x + pointerX * (1 - scaleRatio),
                  y: prevOffset.y + pointerY * (1 - scaleRatio)
              };
          });
          return nextScale;
      });
  };

  const resetCanvasView = () => {
      setCanvasScale(1);
      setCanvasOffset({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-100 dark:bg-zinc-950 transition-colors relative overflow-hidden text-zinc-900 dark:text-zinc-100 p-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
      
      {contextMenu.visible && (
        <ContextMenu 
            x={contextMenu.x} y={contextMenu.y} 
            onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))} 
            onCopy={() => { if(selectedIds.size === 1) { const id = Array.from(selectedIds)[0] as string; const el = findElementById(id, elements); if(el) setClipboard(el); } }}
            onDelete={deleteSelected}
            onAlign={handleAlign}
            onLayerAction={handleLayerAction}
            selectedElement={selectedIds.size === 1 ? findElementById(Array.from(selectedIds)[0] as string, elements) : undefined}
            selectedCount={selectedIds.size}
        />
      )}

      <div className="w-full h-full max-w-[1920px] mx-auto bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative border border-zinc-200/50 dark:border-zinc-800/50">
        
        <WorkspaceHeader 
            onClose={onClose} 
            undo={undo} redo={redo} historyLength={historyLength} redoStackLength={redoStackLength}
            projectName={projectName} setProjectName={setProjectName} onSave={handleSaveProject} onImport={handleImportProject}
            toolMode={toolMode} setToolMode={setToolMode}
            onGroup={handleGroup} onUngroup={handleUngroup} onUnion={handleMerge} onSubtract={handleSubtract}
            addElement={addElement} onSVGUpload={handleSVGUpload}
            selectedSplineId={selectedIds.size === 1 && findElementById(Array.from(selectedIds)[0] as string, elements)?.type === 'spline' ? Array.from(selectedIds)[0] as string : undefined}
            resumeSplineEditing={resumeSplineEditing} removeLastSplinePoint={removeLastSplinePoint}
            isPanMode={isSpacePressed}
            onResetView={resetCanvasView}
        />

        <div className="flex-1 flex overflow-hidden">
            <WorkspaceLayers 
                elements={elements} selectedIds={selectedIds} setSelectedIds={setSelectedIds} toolMode={toolMode}
                onReorderLayer={handleLayerReorder}
            />

            {/* Center Area: Canvas + Footer */}
            <div className="flex-1 flex flex-col relative min-w-0">
                
                {/* Canvas Container */}
                <div className="flex-1 relative">
                    <WorkspaceCanvas 
                        svgRef={svgRef} elementRefs={elementRefs} elements={elements} selectedIds={selectedIds}
                        onMouseDown={handleSVGMouseDown} onContextMenu={handleContextMenu}
                        onSplinePointMouseDown={handleSplinePointMouseDown}
                        selectionBox={selectionBox}
                        canvasScale={canvasScale}
                        canvasOffset={canvasOffset}
                        isPanning={isPanning}
                        isSpacePressed={isSpacePressed}
                    />
                </div>
                
                {/* Footer Container - Static below canvas */}
                <div className="shrink-0 p-4 flex justify-center z-20 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
                    <WorkspaceFooter 
                        isPlaying={isPlaying} setIsPlaying={setIsPlaying} trackTitle={trackTitle} 
                        sourceType={sourceType} setSourceType={setSourceType} volume={volume} setVolume={setVolume}
                        onFileUpload={handleFileUpload} onTabShare={handleTabShare}
                    />
                </div>
            </div>

            <WorkspaceProperties 
                selectedIds={selectedIds} elements={elements} 
                onUpdate={(id, u) => { const newEls = updateElementInList(elements, id, u); pushHistory(newEls); }}
                onGroup={handleGroup}
            />
        </div>
      </div>
    </div>
  );
};

export default Workspace;
