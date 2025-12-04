import React, { RefObject } from "react";
import {
  VisualizerElement,
  DragMode,
  SelectionBox,
  GridVariant,
} from "../../types";
import {
  getSplinePath,
  isFillActive,
  isStrokeActive,
  resolveStrokeColor,
  resolveStrokeWidth,
} from "./utils";

interface SnapGuideOverlay {
  vertical?: number;
  horizontal?: number;
  objectVertical?: number;
  objectHorizontal?: number;
  objectWidth?: number;
  objectHeight?: number;
  objectId?: string;
}

interface WorkspaceCanvasProps {
  svgRef: RefObject<SVGSVGElement | null>;
  elementRefs: React.MutableRefObject<Map<string, SVGElement>>;
  elements: VisualizerElement[];
  selectedIds: Set<string>;
  activeGroupEditId?: string | null;
  innerSelectionId?: string | null;
  onMouseDown: (e: React.MouseEvent, mode: DragMode, id?: string) => void;
  onContextMenu: (e: React.MouseEvent, id?: string) => void;
  // Spline handlers
  onSplinePointMouseDown: (
    e: React.MouseEvent,
    elId: string,
    idx: number,
    type: "anchor" | "in" | "out"
  ) => void;
  selectionBox?: SelectionBox;
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  isPanning: boolean;
  isSpacePressed: boolean;
  showGrid: boolean;
  gridVariant: GridVariant;
  snapGuides?: SnapGuideOverlay | null;
}

const WorkspaceCanvas: React.FC<WorkspaceCanvasProps> = ({
  svgRef,
  elementRefs,
  elements,
  selectedIds,
  activeGroupEditId,
  innerSelectionId,
  onMouseDown,
  onContextMenu,
  onSplinePointMouseDown,
  selectionBox,
  canvasScale,
  canvasOffset,
  isPanning,
  isSpacePressed,
  showGrid,
  gridVariant,
  snapGuides,
}) => {
  const transformStyle: React.CSSProperties = {
    transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`,
    transformOrigin: "0 0",
  };
  const panCursor = isPanning
    ? "grabbing"
    : isSpacePressed
    ? "grab"
    : undefined;
  const getGridStyle = (variant: GridVariant): React.CSSProperties => {
    const base: React.CSSProperties = {};
    if (variant === "straight") {
      return {
        ...base,
        backgroundImage:
          "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px), linear-gradient(to right, currentColor 0.5px, transparent 0.5px), linear-gradient(to bottom, currentColor 0.5px, transparent 0.5px)",
        backgroundSize: "32px 32px, 32px 32px, 16px 16px, 16px 16px",
      };
    }
    if (variant === "dots") {
      return {
        ...base,
        backgroundImage:
          "radial-gradient(currentColor 1.2px, transparent 1.2px), radial-gradient(currentColor 0.55px, transparent 0.55px)",
        backgroundSize: "36px 36px, 18px 18px",
        backgroundPosition: "0 0, 9px 9px",
      };
    }
    return {
      ...base,
      backgroundImage:
        "linear-gradient(45deg, currentColor 25%, transparent 25%), linear-gradient(-45deg, currentColor 25%, transparent 25%), linear-gradient(45deg, transparent 75%, currentColor 75%), linear-gradient(-45deg, transparent 75%, currentColor 75%)",
      backgroundSize: "20px 20px",
    };
  };

  const renderSplineControls = (el: VisualizerElement) => {
    if (el.type !== "spline" || !el.points || !selectedIds.has(el.id))
      return null;
    return (
      <g>
        {el.points.map((p, i) => {
          const handleInX = p.x + (p.handleIn?.x || 0);
          const handleInY = p.y + (p.handleIn?.y || 0);
          const handleOutX = p.x + (p.handleOut?.x || 0);
          const handleOutY = p.y + (p.handleOut?.y || 0);
          return (
            <g key={i}>
              <line
                x1={p.x}
                y1={p.y}
                x2={handleInX}
                y2={handleInY}
                stroke="#9ca3af"
                strokeWidth="1"
                strokeDasharray="2 2"
                pointerEvents="none"
              />
              <line
                x1={p.x}
                y1={p.y}
                x2={handleOutX}
                y2={handleOutY}
                stroke="#9ca3af"
                strokeWidth="1"
                strokeDasharray="2 2"
                pointerEvents="none"
              />
              <circle
                cx={handleInX}
                cy={handleInY}
                r="3"
                fill="#ef4444"
                stroke="white"
                strokeWidth="1"
                className="cursor-pointer"
                style={{ transformOrigin: "center", transformBox: "fill-box" }}
                onMouseDown={(e) => onSplinePointMouseDown(e, el.id, i, "in")}
              />
              <circle
                cx={handleOutX}
                cy={handleOutY}
                r="3"
                fill="#ef4444"
                stroke="white"
                strokeWidth="1"
                className="cursor-pointer"
                style={{ transformOrigin: "center", transformBox: "fill-box" }}
                onMouseDown={(e) => onSplinePointMouseDown(e, el.id, i, "out")}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#3b82f6"
                stroke="white"
                strokeWidth="1.5"
                className="cursor-pointer"
                style={{ transformOrigin: "center", transformBox: "fill-box" }}
                onMouseDown={(e) =>
                  onSplinePointMouseDown(e, el.id, i, "anchor")
                }
              />
            </g>
          );
        })}
      </g>
    );
  };

  const renderShape = (el: VisualizerElement, outerGroupId?: string) => {
    const currentOutermost =
      outerGroupId ?? (el.type === "group" ? el.id : undefined);
    const isInsideActiveGroup = !!(
      activeGroupEditId &&
      currentOutermost &&
      activeGroupEditId === currentOutermost
    );
    const interactionId = isInsideActiveGroup
      ? el.id
      : currentOutermost && currentOutermost !== el.id
      ? currentOutermost
      : el.id;
    const xStr = `${el.x * 100}%`;
    const yStr = `${el.y * 100}%`;
    const commonProps = {
      style: {
        transformOrigin: "center",
        transformBox: "fill-box",
      } as React.CSSProperties,
    };

    const fillActive = isFillActive(el);
    let fillProp: any = { fill: "none" };
    let defs = null;
    if (fillActive) {
      if (el.fillType === "gradient" && el.gradient) {
        const gradId = `grad_${el.id}`;
        fillProp = { fill: `url(#${gradId})` };
        defs = (
          <defs>
            <linearGradient
              id={gradId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
              gradientTransform={`rotate(${el.gradient.angle || 0})`}
            >
              <stop offset="0%" stopColor={el.gradient.start} />
              <stop offset="100%" stopColor={el.gradient.end} />
            </linearGradient>
          </defs>
        );
      } else {
        fillProp = { fill: el.color };
      }
    }

    const strokeActive = isStrokeActive(el);
    const strokeProp = strokeActive
      ? { stroke: resolveStrokeColor(el), strokeWidth: resolveStrokeWidth(el) }
      : { stroke: "none" };

    let shape;
    if (el.type === "group") {
      const width = el.width;
      const height = el.height;
      shape = (
        <g>
          <rect
            x={-width / 2}
            y={-height / 2}
            width={width}
            height={height}
            fill="transparent"
            pointerEvents="visiblePainted"
          />
          {el.children?.map((child) =>
            renderShape(child, currentOutermost ?? el.id)
          )}
        </g>
      );
    } else if (el.type === "circle")
      shape = (
        <circle
          data-shape-root
          cx="0"
          cy="0"
          r={el.width / 2}
          {...fillProp}
          {...strokeProp}
          {...commonProps}
        />
      );
    else if (el.type === "rect" || el.type === "bar")
      shape = (
        <rect
          data-shape-root
          x={-el.width / 2}
          y={-el.height / 2}
          width={el.width}
          height={el.height}
          {...fillProp}
          {...strokeProp}
          {...commonProps}
        />
      );
    else if (el.type === "line")
      shape = (
        <line
          data-shape-root
          x1={-el.width / 2}
          y1="0"
          x2={el.width / 2}
          y2="0"
          {...strokeProp}
          {...commonProps}
        />
      );
    else if (el.type === "triangle")
      shape = (
        <polygon
          data-shape-root
          points={`0,${-el.height / 2} ${el.width / 2},${el.height / 2} ${
            -el.width / 2
          },${el.height / 2}`}
          {...fillProp}
          {...strokeProp}
          {...commonProps}
        />
      );
    else if (el.type === "freeform" && el.points) {
      const d = el.points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");
      shape = (
        <path
          data-shape-root
          d={d}
          {...fillProp}
          {...strokeProp}
          {...commonProps}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    } else if (el.type === "spline" && el.points) {
      const d = getSplinePath(el.points, !!el.isClosed);
      shape = (
        <g>
          <path
            data-shape-root
            d={d}
            {...fillProp}
            {...strokeProp}
            {...commonProps}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {renderSplineControls(el)}
        </g>
      );
    } else if (el.type === "custom" && el.svgContent) {
      shape = (
        <svg
          viewBox={el.viewBox}
          x={-el.width / 2}
          y={-el.height / 2}
          width={el.width}
          height={el.height}
          overflow="visible"
          {...commonProps}
        >
          <g
            data-shape-root
            data-custom-shape="true"
            data-base-color={el.color}
            dangerouslySetInnerHTML={{ __html: el.svgContent || "" }}
            fill="currentColor"
            stroke="currentColor"
            style={{ color: el.color }}
          />
        </svg>
      );
    }

    const isInnerSelected = innerSelectionId === el.id;
    const isSelected = selectedIds.has(el.id) || isInnerSelected;
    const showSelectionOutline =
      ((selectedIds.has(el.id) ||
        (activeGroupEditId === el.id && el.type === "group")) &&
        el.type !== "spline") ||
      (isInnerSelected && el.type !== "spline");
    const showHandles = selectedIds.has(el.id) && el.type !== "spline";
    const isActiveEditGroup = activeGroupEditId === el.id;
    const centerNorm = `${el.x},${el.y}`;
    const dataSize = `${el.width},${el.height}`;
    return (
      <g
        key={el.id}
        style={{ translate: `${xStr} ${yStr}`, rotate: `${el.rotation}deg` }}
      >
        {defs}
        <g
          ref={(node) => {
            if (node) elementRefs.current.set(el.id, node as SVGElement);
          }}
          data-element-center={centerNorm}
          data-element-size={dataSize}
          style={{ opacity: el.opacity }}
        >
          <g
            onMouseDown={(e) => onMouseDown(e, "move", interactionId)}
            onContextMenu={(e) => onContextMenu(e, interactionId)}
            data-element-id={el.id}
            className={`cursor-pointer transition-opacity ${
              isSelected ? "opacity-100" : "hover:opacity-80"
            }`}
          >
            {shape}

            {/* Selection Border & Handles */}
            {showSelectionOutline && (
              <>
                <g pointerEvents="none">
                  <rect
                    x={-el.width / 2 - 2}
                    y={-el.height / 2 - 2}
                    width={el.width + 4}
                    height={el.height + 4}
                    fill={
                      isActiveEditGroup ? "rgba(59, 130, 246, 0.08)" : "none"
                    }
                    stroke="#3b82f6"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />
                </g>
                {showHandles && (
                  <g>
                    <rect
                      x={-el.width / 2 - 6}
                      y={-el.height / 2 - 6}
                      width={8}
                      height={8}
                      fill="white"
                      stroke="#3b82f6"
                      strokeWidth="1"
                      className="cursor-nw-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDown(e, "resize-tl", el.id);
                      }}
                    />
                    <rect
                      x={el.width / 2 - 2}
                      y={-el.height / 2 - 6}
                      width={8}
                      height={8}
                      fill="white"
                      stroke="#3b82f6"
                      strokeWidth="1"
                      className="cursor-ne-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDown(e, "resize-tr", el.id);
                      }}
                    />
                    <rect
                      x={-el.width / 2 - 6}
                      y={el.height / 2 - 2}
                      width={8}
                      height={8}
                      fill="white"
                      stroke="#3b82f6"
                      strokeWidth="1"
                      className="cursor-sw-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDown(e, "resize-bl", el.id);
                      }}
                    />
                    <rect
                      x={el.width / 2 - 2}
                      y={el.height / 2 - 2}
                      width={8}
                      height={8}
                      fill="white"
                      stroke="#3b82f6"
                      strokeWidth="1"
                      className="cursor-se-resize"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onMouseDown(e, "resize-br", el.id);
                      }}
                    />
                  </g>
                )}
              </>
            )}
          </g>
        </g>
      </g>
    );
  };

  let snapObjectMetrics: { centerX: number; centerY: number; width: number; height: number } | null = null;
  if (snapGuides?.objectId && svgRef.current) {
    const node = elementRefs.current.get(snapGuides.objectId);
    if (node) {
      const norm = node.getAttribute("data-element-center");
      const dims = node.getAttribute("data-element-size");
      if (norm && dims) {
        const [normX, normY] = norm.split(",").map(Number);
        const [elW, elH] = dims.split(",").map(Number);
        const svgWidth = svgRef.current.clientWidth || svgRef.current.getBoundingClientRect().width;
        const svgHeight = svgRef.current.clientHeight || svgRef.current.getBoundingClientRect().height;
        snapObjectMetrics = {
          centerX: normX * svgWidth,
          centerY: normY * svgHeight,
          width: elW,
          height: elH,
        };
      } else {
        const baseRect = node.getBoundingClientRect();
        const svgRect = svgRef.current.getBoundingClientRect();
        snapObjectMetrics = {
          centerX: baseRect.left + baseRect.width / 2 - svgRect.left,
          centerY: baseRect.top + baseRect.height / 2 - svgRect.top,
          width: baseRect.width,
          height: baseRect.height,
        };
      }
    }
  }

  return (
    <div className="w-full h-full bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col overflow-hidden">
      <div
        className="relative w-full h-full bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
        onMouseDown={(e) => onMouseDown(e, null)}
        onContextMenu={(e) => onContextMenu(e)}
        style={{ cursor: panCursor }}
      >
        <div className="relative w-full h-full" style={transformStyle}>
          {showGrid && (
            <div
              className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08] pointer-events-none text-zinc-900 dark:text-zinc-100 transition-opacity"
              style={getGridStyle(gridVariant)}
            ></div>
          )}
          <svg ref={svgRef} className="w-full h-full block select-none">
            {elements.map((el) => renderShape(el))}

            {selectionBox && selectionBox.visible && (
              <rect
                x={Math.min(selectionBox.startX, selectionBox.currentX)}
                y={Math.min(selectionBox.startY, selectionBox.currentY)}
                width={Math.abs(selectionBox.currentX - selectionBox.startX)}
                height={Math.abs(selectionBox.currentY - selectionBox.startY)}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="#3b82f6"
                strokeWidth="1"
                strokeDasharray="4 2"
                pointerEvents="none"
              />
            )}
          </svg>
          {snapGuides && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {typeof (snapObjectMetrics?.centerX ?? snapGuides.objectVertical) ===
                "number" && (
                <div
                  className="absolute"
                  style={{
                    left: snapObjectMetrics?.centerX ?? snapGuides.objectVertical,
                    top:
                      (snapObjectMetrics?.centerY ?? snapGuides.objectHorizontal ?? 0) -
                      (snapObjectMetrics?.height ?? snapGuides.objectHeight ?? 0) / 2 -
                      12,
                    height:
                      (snapObjectMetrics?.height ?? snapGuides.objectHeight ?? 0) + 24,
                    borderLeft: "1px dashed rgba(16, 185, 129, 0.5)",
                  }}
                ></div>
              )}
              {typeof (snapObjectMetrics?.centerY ?? snapGuides.objectHorizontal) ===
                "number" && (
                <div
                  className="absolute"
                  style={{
                    top: snapObjectMetrics?.centerY ?? snapGuides.objectHorizontal,
                    left:
                      (snapObjectMetrics?.centerX ?? snapGuides.objectVertical ?? 0) -
                      (snapObjectMetrics?.width ?? snapGuides.objectWidth ?? 0) / 2 -
                      12,
                    width:
                      (snapObjectMetrics?.width ?? snapGuides.objectWidth ?? 0) + 24,
                    borderTop: "1px dashed rgba(16, 185, 129, 0.5)",
                  }}
                ></div>
              )}
              {typeof snapGuides.vertical === "number" && svgRef.current && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-emerald-500/80 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]"
                  style={{
                    left:
                      snapGuides.vertical *
                      (svgRef.current.clientWidth ||
                        svgRef.current.getBoundingClientRect().width),
                  }}
                ></div>
              )}
              {typeof snapGuides.horizontal === "number" && svgRef.current && (
                <div
                  className="absolute left-0 right-0 h-px bg-emerald-500/80 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]"
                  style={{
                    top:
                      snapGuides.horizontal *
                      (svgRef.current.clientHeight ||
                        svgRef.current.getBoundingClientRect().height),
                  }}
                ></div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceCanvas;
