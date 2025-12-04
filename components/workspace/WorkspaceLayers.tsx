import React, { useState, useEffect, useRef } from "react";
import {
  Group,
  Circle,
  ChevronRight,
  ChevronDown,
  Square,
  Triangle,
  Minus,
  Image as ImageIcon,
  PenTool,
  MousePointer2,
  Play,
  Pause,
  Mic,
  Monitor,
  Music,
  Upload,
  Volume2,
  ChartNoAxesColumn,
} from "lucide-react";
import { AudioSourceType, VisualizerElement } from "../../types";
import { Button, IconButton, Slider } from "../ui/primitives";
import { findGroupAncestors } from "./elementTree";

interface WorkspaceLayersProps {
  elements: VisualizerElement[];
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  toolMode: string;
  onReorderLayer: (
    sourceId: string,
    targetId: string,
    position: "before" | "after"
  ) => void;
  innerSelectionId?: string | null;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  trackTitle: string;
  sourceType: AudioSourceType;
  setSourceType: React.Dispatch<React.SetStateAction<AudioSourceType>>;
  volume: number;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTabShare: () => void | Promise<void>;
  graphEnabled: boolean;
  setGraphEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

const WorkspaceLayers: React.FC<WorkspaceLayersProps> = ({
  elements,
  selectedIds,
  setSelectedIds,
  toolMode,
  onReorderLayer,
  innerSelectionId,
  isPlaying,
  setIsPlaying,
  trackTitle,
  sourceType,
  setSourceType,
  volume,
  setVolume,
  onFileUpload,
  onTabShare,
  graphEnabled,
  setGraphEnabled,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{
    id: string;
    position: "above" | "below";
  } | null>(null);
  const fileImportRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!innerSelectionId) return;
    const ancestors = findGroupAncestors(elements, innerSelectionId);
    if (ancestors.length === 0) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      ancestors.forEach((ancestor) => next.add(ancestor.id));
      return next;
    });
  }, [innerSelectionId, elements]);

  const resetDragState = () => {
    setDraggingId(null);
    setDragOver(null);
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedIds(newSet);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "group":
        return <Group size={14} />;
      case "rect":
        return <Square size={14} />;
      case "triangle":
        return <Triangle size={14} />;
      case "line":
        return <Minus size={14} />;
      case "spline":
        return <PenTool size={14} />;
      case "freeform":
        return <MousePointer2 size={14} />;
      case "custom":
        return <ImageIcon size={14} />;
      default:
        return <Circle size={14} />;
    }
  };

  const renderLayer = (
    el: VisualizerElement,
    depth: number = 0,
    isParentReversed: boolean = true
  ) => {
    const isInnerFocused = innerSelectionId === el.id;
    const isSelected = selectedIds.has(el.id) || isInnerFocused;
    const isExpanded = expandedIds.has(el.id);
    const hasChildren =
      el.type === "group" && el.children && el.children.length > 0;
    const isDragTarget = dragOver?.id === el.id;
    const dragPosition = dragOver?.position;

    return (
      <React.Fragment key={el.id}>
        <div className="relative">
          {isDragTarget && draggingId !== el.id && (
            <div
              className={`absolute left-2 right-2 h-0.5 bg-blue-500 rounded-full pointer-events-none ${
                dragPosition === "above" ? "-top-1" : "-bottom-1"
              }`}
            ></div>
          )}
          <div
            draggable
            className={`w-full flex items-center gap-2 p-2 rounded-xl mb-1 text-left transition-all group cursor-pointer border border-transparent select-none
                ${
                  isSelected
                    ? "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shadow-sm"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }
                ${draggingId === el.id ? "opacity-60" : ""}`}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
            onClick={(e) => {
              if (e.shiftKey) {
                const s = new Set(selectedIds);
                if (s.has(el.id)) s.delete(el.id);
                else s.add(el.id);
                setSelectedIds(s);
              } else {
                if (toolMode !== "spline") {
                  setSelectedIds(new Set([el.id]));
                }
              }
            }}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", el.id);
              e.dataTransfer.effectAllowed = "move";
              setDraggingId(el.id);
              if (!selectedIds.has(el.id) && toolMode !== "spline") {
                setSelectedIds(new Set([el.id]));
              }
            }}
            onDragOver={(e) => {
              if (!draggingId || draggingId === el.id) return;
              e.preventDefault();
              const rect = (
                e.currentTarget as HTMLDivElement
              ).getBoundingClientRect();
              const position =
                e.clientY - rect.top < rect.height / 2 ? "above" : "below";
              setDragOver((prev) => {
                if (prev && prev.id === el.id && prev.position === position)
                  return prev;
                return { id: el.id, position };
              });
            }}
            onDrop={(e) => {
              if (!draggingId || draggingId === el.id) return;
              e.preventDefault();
              const dropPosition = dragOver?.position || "above";
              const relativePosition = isParentReversed
                ? dropPosition === "above"
                  ? "after"
                  : "before"
                : dropPosition === "above"
                ? "before"
                : "after";
              onReorderLayer(draggingId, el.id, relativePosition);
              resetDragState();
            }}
            onDragLeave={(e) => {
              const related = e.relatedTarget as Node | null;
              if (
                !related ||
                !(e.currentTarget as HTMLDivElement).contains(related as Node)
              ) {
                setDragOver((prev) => (prev?.id === el.id ? null : prev));
              }
            }}
            onDragEnd={resetDragState}
          >
            {/* Expand/Collapse Chevron */}
            <div
              className={`w-4 h-4 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 ${
                hasChildren ? "visible" : "invisible"
              }`}
              onClick={(e) => hasChildren && toggleExpand(e, el.id)}
            >
              {isExpanded ? (
                <ChevronDown size={12} />
              ) : (
                <ChevronRight size={12} />
              )}
            </div>

            {/* Icon */}
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                isSelected
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
              }`}
            >
              {getIcon(el.type)}
            </div>

            {/* Name */}
            <div className="flex flex-col flex-1 min-w-0">
              <span
                className={`text-xs font-medium truncate ${
                  isSelected
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {el.name}
              </span>
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col">
            {/* Render children in reverse order so top item is visually first (like Z-index stack usually implies) 
                    or direct order depending on preference. Usually Layer lists show Top-most element at Top.
                    Our array is [bottom, ..., top]. So we reverse for display.
                */}
            {[...(el.children || [])]
              .reverse()
              .map((child) => renderLayer(child, depth + 1, true))}
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="w-64 border-r border-zinc-100 dark:border-zinc-800 flex flex-col shrink-0 z-20 bg-white dark:bg-zinc-900">
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Layers
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {[...elements].reverse().map((el) => renderLayer(el, 0, true))}
        {elements.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-400 text-xs italic">
            No elements
          </div>
        )}
      </div>
      <div className="border-t border-zinc-100 dark:border-zinc-800 p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsPlaying(!isPlaying)}
              size="sm"
              variant={isPlaying ? "secondary" : "primary"}
              iconOnly
              className="rounded-full"
              aria-label={isPlaying ? "Pause playback" : "Play audio"}
            >
              {isPlaying ? (
                <Pause size={15} />
              ) : (
                <Play size={15} className="ml-0.5" />
              )}
            </Button>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                {trackTitle}
              </span>
              <span className="text-[10px] uppercase text-zinc-400">
                {sourceType}
              </span>
            </div>
          </div>
          <Button
            type="button"
            size="xs"
            variant={graphEnabled ? "primary" : "secondary"}
            iconOnly
            className="rounded-lg"
            onClick={() => setGraphEnabled((prev) => !prev)}
            aria-label={graphEnabled ? "Spectrum on" : "Spectrum off"}
            title="Toggle Spectrum Graph"
          >
            <ChartNoAxesColumn size={14} />
          </Button>
        </div>
        <div className="flex items-center justify-between gap-1">
          <IconButton
            onClick={() => setSourceType(AudioSourceType.MICROPHONE)}
            active={sourceType === AudioSourceType.MICROPHONE}
            size="sm"
            title="Microphone"
            aria-label="Use microphone input"
          >
            <Mic size={14} />
          </IconButton>
          <IconButton
            onClick={() => onTabShare()}
            active={sourceType === AudioSourceType.TAB}
            size="sm"
            title="Tab Audio"
            aria-label="Share tab audio"
          >
            <Monitor size={14} />
          </IconButton>
          <IconButton
            onClick={() => fileImportRef.current?.click()}
            active={sourceType === AudioSourceType.FILE}
            size="sm"
            title="Upload"
            aria-label="Upload audio file"
          >
            <Upload size={14} />
          </IconButton>
          <IconButton
            onClick={() => setSourceType(AudioSourceType.OSCILLATOR)}
            active={sourceType === AudioSourceType.OSCILLATOR}
            size="sm"
            title="Demo"
            aria-label="Use demo tone"
          >
            <Music size={14} />
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
          <div className="flex items-center gap-2 flex-1">
            <Volume2 size={14} className="text-zinc-400" />
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceLayers;
