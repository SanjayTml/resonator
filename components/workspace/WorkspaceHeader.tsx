import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Undo2,
  Redo2,
  Group,
  Ungroup,
  Combine,
  Scissors,
  MousePointer2,
  Pencil,
  PenTool,
  Plus,
  ChevronDown,
  Circle,
  Square,
  Triangle,
  Minus,
  Image as ImageIcon,
  FolderOpen,
  Download,
  PlusCircle,
  Delete,
  Hand,
  Expand,
  Grid,
} from "lucide-react";
import { ElementType, GridVariant } from "../../types";
import { Button, IconButton, TextInput } from "../ui/primitives";

interface WorkspaceHeaderProps {
  onClose: () => void;
  undo: () => void;
  redo: () => void;
  historyLength: number;
  redoStackLength: number;
  projectName: string;
  setProjectName: (name: string) => void;
  onSave: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toolMode: "pointer" | "shape" | "freeform" | "spline";
  setToolMode: (mode: "pointer" | "shape" | "freeform" | "spline") => void;
  onGroup: () => void;
  onUngroup: () => void;
  onUnion: () => void;
  onSubtract: () => void;
  addElement: (type: ElementType) => void;
  onAssetUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedSplineId?: string;
  resumeSplineEditing: () => void;
  removeLastSplinePoint: () => void;
  isPanMode: boolean;
  onResetView: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  gridVariant: GridVariant;
  onSelectGridVariant: (variant: GridVariant) => void;
}

const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  onClose,
  undo,
  redo,
  historyLength,
  redoStackLength,
  projectName,
  setProjectName,
  onSave,
  onImport,
  toolMode,
  setToolMode,
  onGroup,
  onUngroup,
  onUnion,
  onSubtract,
  addElement,
  onAssetUpload,
  selectedSplineId,
  resumeSplineEditing,
  removeLastSplinePoint,
  isPanMode,
  onResetView,
  showGrid,
  onToggleGrid,
  gridVariant,
  onSelectGridVariant,
}) => {
  const fileProjectImportRef = useRef<HTMLInputElement>(null);
  const svgUploadRef = useRef<HTMLInputElement>(null);
  const [shapeMenuVisible, setShapeMenuVisible] = useState(false);
  const [shapeMenuPinned, setShapeMenuPinned] = useState(false);
  const [gridMenuOpen, setGridMenuOpen] = useState(false);
  const gridMenuRef = useRef<HTMLDivElement>(null);
  const hideShapeMenuTimeout = useRef<NodeJS.Timeout | null>(null);
  const GRID_VARIANTS: {
    id: GridVariant;
    label: string;
    description: string;
  }[] = [
    {
      id: "straight",
      label: "Straight Grid",
      description: "Orthogonal rows and columns",
    },
    {
      id: "diagonal",
      label: "Diagonal Grid",
      description: "45° cross pattern",
    },
    { id: "dots", label: "Dot Grid", description: "Subtle dotted guides" },
  ];
  const showShapeMenu = () => {
    if (hideShapeMenuTimeout.current) {
      clearTimeout(hideShapeMenuTimeout.current);
      hideShapeMenuTimeout.current = null;
    }
    setShapeMenuVisible(true);
  };
  const hideShapeMenu = () => {
    if (hideShapeMenuTimeout.current) {
      clearTimeout(hideShapeMenuTimeout.current);
      hideShapeMenuTimeout.current = null;
    }
    setShapeMenuVisible(false);
    setShapeMenuPinned(false);
  };
  const scheduleShapeMenuHide = () => {
    if (shapeMenuPinned) return;
    if (hideShapeMenuTimeout.current)
      clearTimeout(hideShapeMenuTimeout.current);
    hideShapeMenuTimeout.current = setTimeout(() => {
      setShapeMenuVisible(false);
    }, 200);
  };
  const handleShapeButtonClick = () => {
    setToolMode("shape");
    setShapeMenuPinned((prev) => {
      const next = !prev;
      if (next) showShapeMenu();
      else hideShapeMenu();
      return next;
    });
  };
  const handleShapeSelect = (type: ElementType) => {
    addElement(type);
    hideShapeMenu();
  };
  useEffect(() => {
    return () => {
      if (hideShapeMenuTimeout.current)
        clearTimeout(hideShapeMenuTimeout.current);
    };
  }, []);
  useEffect(() => {
    if (!gridMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (
        gridMenuRef.current &&
        !gridMenuRef.current.contains(event.target as Node)
      ) {
        setGridMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [gridMenuOpen]);

  return (
    <div className="h-16 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-6 shrink-0 bg-white dark:bg-zinc-900 z-30">
      <div className="flex items-center gap-4">
        <IconButton
          onClick={onClose}
          title="Close workspace"
          aria-label="Close workspace"
        >
          <X size={18} />
        </IconButton>
        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>

        <div className="flex items-center gap-1">
          <IconButton
            onClick={undo}
            disabled={historyLength === 0}
            title="Undo"
            aria-label="Undo"
          >
            <Undo2 size={16} />
          </IconButton>
          <IconButton
            onClick={redo}
            disabled={redoStackLength === 0}
            title="Redo"
            aria-label="Redo"
          >
            <Redo2 size={16} />
          </IconButton>
        </div>
        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>

        <div className="flex items-center gap-1">
          <IconButton onClick={onGroup} title="Group" aria-label="Group">
            <Group size={16} />
          </IconButton>
          <IconButton onClick={onUngroup} title="Ungroup" aria-label="Ungroup">
            <Ungroup size={16} />
          </IconButton>
          <IconButton onClick={onUnion} title="Merge" aria-label="Merge">
            <Combine size={16} />
          </IconButton>
          <IconButton
            onClick={onSubtract}
            title="Subtract"
            aria-label="Subtract"
          >
            <Scissors size={16} />
          </IconButton>
        </div>

        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>

        {/* Spline Context Tools */}
        {selectedSplineId && (
          <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-1 border border-blue-100 dark:border-blue-800/50 mx-2">
            <span className="text-[10px] font-bold text-blue-500 uppercase px-2">
              Spline
            </span>
            <IconButton
              onClick={resumeSplineEditing}
              tone="primary"
              title="Append Points"
              aria-label="Append spline points"
            >
              <PlusCircle size={16} />
            </IconButton>
            <IconButton
              onClick={removeLastSplinePoint}
              tone="primary"
              title="Remove Last Point"
              aria-label="Remove last spline point"
            >
              <Delete size={16} />
            </IconButton>
          </div>
        )}

        <div className="flex items-center gap-1">
          <IconButton
            onClick={() => setToolMode("pointer")}
            active={toolMode === "pointer"}
            title={isPanMode ? "Pan (Space)" : "Pointer"}
            aria-label="Pointer tool"
          >
            {isPanMode ? <Hand size={16} /> : <MousePointer2 size={16} />}
          </IconButton>
          <IconButton
            onClick={() => setToolMode("freeform")}
            active={toolMode === "freeform"}
            title="Freeform Line"
            aria-label="Freeform tool"
          >
            <Pencil size={16} />
          </IconButton>
          <IconButton
            onClick={() => setToolMode("spline")}
            active={toolMode === "spline"}
            title="Spline Curve"
            aria-label="Spline tool"
          >
            <PenTool size={16} />
          </IconButton>
          <div
            className="relative"
            onMouseEnter={() => {
              showShapeMenu();
            }}
            onMouseLeave={scheduleShapeMenuHide}
          >
            <Button
              variant={toolMode === "shape" ? "secondary" : "ghost"}
              size="sm"
              className="px-2 py-2 h-auto rounded-lg flex items-center gap-1 text-xs"
              title="Add shape"
              onClick={handleShapeButtonClick}
              aria-haspopup="menu"
              aria-expanded={shapeMenuVisible}
            >
              <Plus size={16} />
              <ChevronDown size={12} />
            </Button>
            <div
              className={`absolute top-full left-0 mt-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-1 w-40 z-50 transition-all duration-150 ${
                shapeMenuVisible
                  ? "opacity-100 visible translate-y-0"
                  : "opacity-0 invisible -translate-y-1 pointer-events-none"
              }`}
            >
              <button
                onClick={() => handleShapeSelect("circle")}
                className="flex items-center gap-3 w-full text-left p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"
              >
                <Circle size={14} /> Circle
              </button>
              <button
                onClick={() => handleShapeSelect("rect")}
                className="flex items-center gap-3 w-full text-left p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"
              >
                <Square size={14} /> Square
              </button>
              <button
                onClick={() => handleShapeSelect("triangle")}
                className="flex items-center gap-3 w-full text-left p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"
              >
                <Triangle size={14} /> Triangle
              </button>
              <button
                onClick={() => handleShapeSelect("line")}
                className="flex items-center gap-3 w-full text-left p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"
              >
                <Minus size={14} /> Line
              </button>
              <div className="h-px bg-zinc-100 dark:bg-zinc-700 my-1"></div>
              <button
                onClick={() => {
                  hideShapeMenu();
                  svgUploadRef.current?.click();
                }}
                className="
                        flex items-center gap-3 w-full text-left p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300
                      "
              >
                <ImageIcon size={14} /> Upload Asset
              </button>
              <input
                ref={svgUploadRef}
                type="file"
                accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={onAssetUpload}
              />
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>

        <div className="flex items-center gap-1">
          <div className="relative" ref={gridMenuRef}>
            <IconButton
              onClick={onToggleGrid}
              active={showGrid}
              title={showGrid ? "Hide Grid" : "Show Grid"}
              aria-label="Toggle grid visibility"
              aria-haspopup="menu"
              aria-expanded={gridMenuOpen}
            >
              <div className="relative flex items-center justify-center">
                <Grid size={16} />
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Select grid variant"
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] flex items-center justify-center shadow-sm cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGridMenuOpen((prev) => !prev);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      setGridMenuOpen((prev) => !prev);
                    }
                  }}
                >
                  <ChevronDown
                    size={10}
                    className={`transition-transform ${
                      gridMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </span>
              </div>
            </IconButton>
            <div
              className={`absolute right-0 top-full mt-2 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-1 z-50 transition-all duration-150 ${
                gridMenuOpen
                  ? "opacity-100 visible translate-y-0"
                  : "opacity-0 invisible -translate-y-1 pointer-events-none"
              }`}
            >
              {GRID_VARIANTS.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => {
                    onSelectGridVariant(variant.id);
                    setGridMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    gridVariant === variant.id
                      ? "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-semibold"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="flex flex-col">
                    <span>{variant.label}</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                      {variant.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <IconButton
            onClick={onResetView}
            title="Reset View"
            aria-label="Reset view"
          >
            <Expand size={16} />
          </IconButton>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <TextInput
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          size="sm"
          block={false}
          className="bg-transparent border-none focus:ring-0 focus:border-transparent text-center font-semibold text-zinc-900 dark:text-zinc-100"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => fileProjectImportRef.current?.click()}
          >
            <FolderOpen size={14} /> Open
          </Button>
          <Button size="sm" className="gap-2" onClick={onSave}>
            <Download size={14} /> Save
          </Button>
          <input
            ref={fileProjectImportRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={onImport}
          />
        </div>
      </div>
    </div>
  );
};

export default WorkspaceHeader;
