import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { VisualizerElement } from "../../types";
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
}

const WorkspaceLayers: React.FC<WorkspaceLayersProps> = ({
  elements,
  selectedIds,
  setSelectedIds,
  toolMode,
  onReorderLayer,
  innerSelectionId,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{
    id: string;
    position: "above" | "below";
  } | null>(null);

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
    </div>
  );
};

export default WorkspaceLayers;
