import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  VisualizerElement,
  ElementType,
  DragMode,
  SelectionBox,
  Alignment,
  GridVariant,
} from "../types";
import { WorkspaceFont } from "../types";
import {
  generateMergedElement,
  generateSubtractedElement,
  isFillActive,
  isStrokeActive,
} from "./workspace/utils";
import WorkspaceHeader from "./workspace/WorkspaceHeader";
import WorkspaceLayers from "./workspace/WorkspaceLayers";
import WorkspaceFooter from "./workspace/WorkspaceFooter";
import WorkspaceProperties from "./workspace/WorkspaceProperties";
import WorkspaceCanvas from "./workspace/WorkspaceCanvas";
import ContextMenu from "./workspace/ContextMenu";
import useHistoryManager from "./workspace/hooks/useHistoryManager";
import useAudioEngine from "./workspace/hooks/useAudioEngine";
import {
  findElementById,
  updateElementInList,
  removeElementFromList,
  moveElementRelative,
  changeElementLayer,
  findElementPath,
  LayerShift,
  findNearestGroupAncestor,
  findGroupAncestors,
  isDescendantOfGroup,
} from "./workspace/elementTree";
import { interpolateKeyframes } from "./workspace/animation";

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
  type: "anchor" | "in" | "out";
}

const SPLINE_CLOSE_DISTANCE = 12;
type LayerAction =
  | "bring-forward"
  | "send-backward"
  | "bring-to-front"
  | "send-to-back";

interface SnapGuideState {
  vertical?: number;
  horizontal?: number;
  objectVertical?: number;
  objectHorizontal?: number;
  objectWidth?: number;
  objectHeight?: number;
  objectId?: string;
}

const CANVAS_SIZE_PRESETS = [
  {
    id: "desktop",
    label: "Desktop",
    description: "1440 x 900 workspace",
    width: 1440,
    height: 900,
  },
  {
    id: "landscape",
    label: "Landscape 16:9",
    description: "1280 x 720 widescreen",
    width: 1280,
    height: 720,
  },
  {
    id: "portrait",
    label: "Portrait 9:16",
    description: "1080 x 1920 vertical",
    width: 1080,
    height: 1920,
  },
  {
    id: "square",
    label: "Square",
    description: "1200 x 1200",
    width: 1200,
    height: 1200,
  },
  {
    id: "polaroid",
    label: "Polaroid",
    description: "900 x 1100 classic",
    width: 900,
    height: 1100,
  },
] as const;

type CanvasPreset = (typeof CANVAS_SIZE_PRESETS)[number];

interface FontOption {
  id: string;
  name: string;
  fontFamily: string;
  isCustom?: boolean;
}

const DEFAULT_FONT_OPTIONS: FontOption[] = [
  {
    id: "font-inter",
    name: "Inter",
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  {
    id: "font-georgia",
    name: "Georgia",
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  {
    id: "font-mono",
    name: "Monospace",
    fontFamily: "'JetBrains Mono', 'SFMono-Regular', Menlo, monospace",
  },
];

const flattenElementsList = (list: VisualizerElement[]): VisualizerElement[] => {
  const result: VisualizerElement[] = [];
  const walk = (items: VisualizerElement[]) => {
    items.forEach((el) => {
      result.push(el);
      if (el.children) walk(el.children);
    });
  };
  walk(list);
  return result;
};

const SNAP_THRESHOLD_PX = 8;
const getGridSpacing = (variant: GridVariant): number => {
  if (variant === "dots") return 18;
  if (variant === "straight") return 32;
  return 24;
};

const MAX_ASSET_SIZE_BYTES = 20 * 1024 * 1024; // 20MB client-side guard
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);
const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
]);

const SUPPORTED_FONT_EXTENSIONS = new Set([
  "ttf",
  "otf",
  "woff",
  "woff2",
]);

const MAX_FONT_SIZE_BYTES = 15 * 1024 * 1024;

const isSvgFile = (file: File) =>
  file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");

const hasSupportedExtension = (file: File) => {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return SUPPORTED_IMAGE_EXTENSIONS.has(ext);
};

const isSupportedAsset = (file: File) => {
  if (SUPPORTED_IMAGE_TYPES.has(file.type)) return true;
  if (file.type.startsWith("image/")) return true;
  return hasSupportedExtension(file);
};

const sanitizeSvgMarkup = (
  raw: string
): { inner: string; viewBox: string } | null => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "image/svg+xml");
  if (doc.querySelector("parsererror")) return null;
  const svgEl = doc.querySelector("svg");
  if (!svgEl) return null;
  const disallowedTags = new Set([
    "script",
    "foreignobject",
    "iframe",
    "object",
    "embed",
    "audio",
    "video",
    "canvas",
    "link",
    "style",
  ]);
  const sanitizeElement = (el: Element) => {
    if (disallowedTags.has(el.tagName.toLowerCase())) {
      el.parentNode?.removeChild(el);
      return;
    }
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        return;
      }
      if (
        (name === "href" || name === "xlink:href") &&
        /^(javascript:|data:text\/html)/i.test(value)
      ) {
        el.removeAttribute(attr.name);
        return;
      }
      if (name === "style") {
        el.removeAttribute(attr.name);
      }
    });
    Array.from(el.childNodes).forEach((child) => {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.parentNode?.removeChild(child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        sanitizeElement(child as Element);
      }
    });
  };
  sanitizeElement(svgEl);
  const viewBox =
    svgEl.getAttribute("viewBox") ||
    `0 0 ${svgEl.getAttribute("width") || "100"} ${
      svgEl.getAttribute("height") || "100"
    }`;
  return { inner: svgEl.innerHTML, viewBox };
};

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const text = reader.result;
      if (typeof text === "string") resolve(text);
      else reject(new Error("Unable to read file as text"));
    };
    reader.readAsText(file);
  });

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const text = reader.result;
      if (typeof text === "string") resolve(text);
      else reject(new Error("Unable to read file as data URL"));
    };
    reader.readAsDataURL(file);
  });

const getImageDimensions = (src: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Unable to read image dimensions"));
    img.src = src;
  });

const clampAssetDimensions = (width?: number, height?: number) => {
  const fallback = 200;
  const safeWidth = width && width > 0 ? width : fallback;
  const safeHeight = height && height > 0 ? height : fallback;
  const maxDimension = 360;
  const largest = Math.max(safeWidth, safeHeight);
  const scale = largest > maxDimension ? maxDimension / largest : 1;
  return {
    width: Math.round(safeWidth * scale),
    height: Math.round(safeHeight * scale),
  };
};

const computeResizeWithAspect = (
  mode: DragMode,
  start: VisualizerElement,
  dx: number,
  dy: number,
  svgRect: DOMRect,
  preserveAspect: boolean
): Partial<VisualizerElement> | null => {
  if (!mode || !mode.startsWith("resize")) return null;
  const moveLeft = mode === "resize-bl" || mode === "resize-tl";
  const moveRight = mode === "resize-br" || mode === "resize-tr";
  const moveTop = mode === "resize-tl" || mode === "resize-tr";
  const moveBottom = mode === "resize-bl" || mode === "resize-br";

  const centerX = start.x * svgRect.width;
  const centerY = start.y * svgRect.height;
  let left = centerX - start.width / 2;
  let right = centerX + start.width / 2;
  let top = centerY - start.height / 2;
  let bottom = centerY + start.height / 2;

  if (moveLeft) left += dx;
  if (moveRight) right += dx;
  if (moveTop) top += dy;
  if (moveBottom) bottom += dy;

  const enforceMinSize = () => {
    const minSize = 10;
    if (right - left < minSize) {
      if (moveLeft && !moveRight) left = right - minSize;
      else if (moveRight && !moveLeft) right = left + minSize;
      else {
        const mid = (left + right) / 2;
        left = mid - minSize / 2;
        right = mid + minSize / 2;
      }
    }
    if (bottom - top < minSize) {
      if (moveTop && !moveBottom) top = bottom - minSize;
      else if (moveBottom && !moveTop) bottom = top + minSize;
      else {
        const mid = (top + bottom) / 2;
        top = mid - minSize / 2;
        bottom = mid + minSize / 2;
      }
    }
  };

  enforceMinSize();

  if (preserveAspect) {
    let aspect = start.width !== 0 ? start.height / start.width : 1;
    if (!Number.isFinite(aspect) || aspect <= 0) aspect = 1;
    const width = right - left;
    const height = bottom - top;
    const widthDelta = width - start.width;
    const heightDelta = height - start.height;
    const lockWidth = Math.abs(widthDelta) >= Math.abs(heightDelta);
    if (lockWidth) {
      const targetHeight = Math.max(10, width * aspect);
      if (moveTop && !moveBottom) top = bottom - targetHeight;
      else bottom = top + targetHeight;
    } else {
      const base = aspect === 0 ? width : height / aspect;
      const targetWidth = Math.max(10, base);
      if (moveLeft && !moveRight) left = right - targetWidth;
      else right = left + targetWidth;
    }
    enforceMinSize();
  }

  const finalWidth = Math.max(10, right - left);
  const finalHeight = Math.max(10, bottom - top);
  const centerNormX = (left + right) / 2 / svgRect.width;
  const centerNormY = (top + bottom) / 2 / svgRect.height;

  return {
    x: centerNormX,
    y: centerNormY,
    width: finalWidth,
    height: finalHeight,
  };
};


interface SnapComputationParams {
  dx: number;
  dy: number;
  svgRect: DOMRect;
  start: VisualizerElement;
  elements: VisualizerElement[];
  movingId: string;
  gridVariant: GridVariant;
  enableGridSnap: boolean;
}

const computeSnapForMove = ({
  dx,
  dy,
  svgRect,
  start,
  elements,
  movingId,
  gridVariant,
  enableGridSnap,
}: SnapComputationParams): { dx: number; dy: number; guides: SnapGuideState } => {
  const startCenterX = start.x * svgRect.width;
  const startCenterY = start.y * svgRect.height;
  const startLeft = startCenterX - start.width / 2;
  const startRight = startCenterX + start.width / 2;
  const startTop = startCenterY - start.height / 2;
  const startBottom = startCenterY + start.height / 2;

  const verticalTargets: number[] = [];
  const horizontalTargets: number[] = [];

  elements.forEach((el) => {
    if (el.id === movingId) return;
    const centerX = el.x * svgRect.width;
    const centerY = el.y * svgRect.height;
    const halfW = el.width / 2;
    const halfH = el.height / 2;
    verticalTargets.push(centerX, centerX - halfW, centerX + halfW);
    horizontalTargets.push(centerY, centerY - halfH, centerY + halfH);
  });

  if (enableGridSnap) {
    const spacing = getGridSpacing(gridVariant);
    if (spacing > 0) {
      for (let x = 0; x <= svgRect.width; x += spacing) {
        verticalTargets.push(x);
      }
      for (let y = 0; y <= svgRect.height; y += spacing) {
        horizontalTargets.push(y);
      }
    }
  }

  const guides: SnapGuideState = {};

  const applyAxisSnap = (
    basePositions: number[],
    delta: number,
    targets: number[]
  ): { delta: number; guide?: number } => {
    let best: { adjust: number; guide: number; diff: number } | null = null;
    basePositions.forEach((base) => {
      const current = base + delta;
      targets.forEach((target) => {
        const diff = Math.abs(current - target);
        if (diff <= SNAP_THRESHOLD_PX) {
          if (!best || diff < best.diff) {
            best = { adjust: target - current, guide: target, diff };
          }
        }
      });
    });
    if (best) {
      return { delta: delta + best.adjust, guide: best.guide };
    }
    return { delta };
  };

  const xSnap = applyAxisSnap(
    [startLeft, startCenterX, startRight],
    dx,
    verticalTargets
  );
  const ySnap = applyAxisSnap(
    [startTop, startCenterY, startBottom],
    dy,
    horizontalTargets
  );

  if (xSnap.guide !== undefined && svgRect.width > 0)
    guides.vertical = xSnap.guide / svgRect.width;
  if (ySnap.guide !== undefined && svgRect.height > 0)
    guides.horizontal = ySnap.guide / svgRect.height;

  const finalDx = xSnap.delta;
  const finalDy = ySnap.delta;

  guides.objectVertical = startCenterX + finalDx;
  guides.objectHorizontal = startCenterY + finalDy;
  guides.objectWidth = start.width;
  guides.objectHeight = start.height;
  guides.objectId = movingId;

  return { dx: finalDx, dy: finalDy, guides };
};

const comparePaths = (a: number[], b: number[]) => {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
};

const randomId = () => Math.random().toString(36).substring(2, 11);

const cloneElementWithNewIds = (
  element: VisualizerElement
): VisualizerElement => {
  const clonedChildren = element.children?.map((child) =>
    cloneElementWithNewIds(child)
  );
  const clonedPoints = element.points
    ? element.points.map((p) => ({
        x: p.x,
        y: p.y,
        handleIn: p.handleIn ? { ...p.handleIn } : undefined,
        handleOut: p.handleOut ? { ...p.handleOut } : undefined,
      }))
    : undefined;
  return {
    ...element,
    id: randomId(),
    gradient: element.gradient ? { ...element.gradient } : element.gradient,
    strokeGradient: element.strokeGradient
      ? { ...element.strokeGradient }
      : element.strokeGradient,
    animationTracks: element.animationTracks.map((track) => ({
      ...track,
      id: randomId(),
      keyframes: track.keyframes.map((kf) => ({ ...kf, id: randomId() })),
    })),
    children: clonedChildren,
    points: clonedPoints,
  };
};

const recomputeGroupLayout = (
  group: VisualizerElement,
  svgW: number,
  svgH: number
): VisualizerElement => {
  if (!group.children || group.children.length === 0) return group;
  let minL = Infinity,
    minT = Infinity,
    maxR = -Infinity,
    maxB = -Infinity;
  group.children.forEach((child) => {
    const childCenterX = (group.x + child.x) * svgW;
    const childCenterY = (group.y + child.y) * svgH;
    const halfW = child.width / 2;
    const halfH = child.height / 2;
    minL = Math.min(minL, childCenterX - halfW);
    maxR = Math.max(maxR, childCenterX + halfW);
    minT = Math.min(minT, childCenterY - halfH);
    maxB = Math.max(maxB, childCenterY + halfH);
  });

  if (
    !Number.isFinite(minL) ||
    !Number.isFinite(minT) ||
    !Number.isFinite(maxR) ||
    !Number.isFinite(maxB)
  )
    return group;

  const width = Math.max(10, maxR - minL);
  const height = Math.max(10, maxB - minT);
  const centerXNorm = (minL + maxR) / 2 / svgW;
  const centerYNorm = (minT + maxB) / 2 / svgH;

  const updatedChildren = group.children.map((child) => {
    const absChildX = group.x + child.x;
    const absChildY = group.y + child.y;
    return {
      ...child,
      x: absChildX - centerXNorm,
      y: absChildY - centerYNorm,
    };
  });

  return {
    ...group,
    x: centerXNorm,
    y: centerYNorm,
    width,
    height,
    children: updatedChildren,
  };
};

const Workspace: React.FC<WorkspaceProps> = ({ onClose, isDarkMode }) => {
  const {
    elements,
    setElements,
    pushHistory,
    undo,
    redo,
    historyLength,
    redoStackLength,
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
    handleFileUpload,
  } = useAudioEngine();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeGroupEdit, setActiveGroupEdit] = useState<string | null>(null);
  const [innerEditSelectionId, setInnerEditSelectionId] = useState<
    string | null
  >(null);
  const [clipboard, setClipboard] = useState<VisualizerElement | null>(null);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [toolMode, setToolMode] = useState<
    "pointer" | "shape" | "freeform" | "spline" | "text"
  >("pointer");
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [gridVariant, setGridVariant] = useState<GridVariant>("straight");
  const [snapGuides, setSnapGuides] = useState<SnapGuideState | null>(null);
  const [graphEnabled, setGraphEnabled] = useState(true);
  const [canvasPresetId, setCanvasPresetId] = useState<string>(
    CANVAS_SIZE_PRESETS[0].id
  );
  const [customFonts, setCustomFonts] = useState<WorkspaceFont[]>([]);
  const loadedFontIds = useRef<Set<string>>(new Set());

  const availableFonts = useMemo<FontOption[]>(() => {
    return [
      ...DEFAULT_FONT_OPTIONS,
      ...customFonts.map<FontOption>((font) => ({
        id: font.id,
        name: font.name,
        fontFamily: font.fontFamily,
        isCustom: true,
      })),
    ];
  }, [customFonts]);

  // Selection Box State
  const [selectionBox, setSelectionBox] = useState<SelectionBox>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    visible: false,
  });

  // Interaction Refs
  const dragMode = useRef<DragMode>(null);
  const isDrawing = useRef(false);
  const drawingId = useRef<string | null>(null);
  const activeSplineId = useRef<string | null>(null);
  const editPointTarget = useRef<EditPointTarget | null>(null);
  const draggingInnerElement = useRef(false);

  const startPos = useRef({ x: 0, y: 0 });
  const startEls = useRef<Map<string, VisualizerElement>>(new Map());
  const svgRef = useRef<SVGSVGElement>(null);
  const elementRefs = useRef<Map<string, SVGElement>>(new Map());
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panOffsetRef = useRef({ x: 0, y: 0 });

  const animationFrameRef = useRef<number>(0);

  const activeCanvasPreset:
    | CanvasPreset
    | (typeof CANVAS_SIZE_PRESETS)[number] =
    CANVAS_SIZE_PRESETS.find((preset) => preset.id === canvasPresetId) ||
    CANVAS_SIZE_PRESETS[0];

  useEffect(() => {
    if (typeof FontFace === "undefined" || !document.fonts) return;
    customFonts.forEach((font) => {
      if (loadedFontIds.current.has(font.id)) return;
      try {
        const face = new FontFace(font.fontFamily, `url(${font.dataUrl})`);
        face
          .load()
          .then((loaded) => {
            document.fonts.add(loaded);
            loadedFontIds.current.add(font.id);
          })
          .catch((err) => {
            console.error(`Failed to load font ${font.name}`, err);
          });
      } catch (err) {
        console.error(`Unable to register font ${font.name}`, err);
      }
    });
  }, [customFonts]);

  const getOutermostGroupId = (elementId: string): string | null => {
    const ancestors = findGroupAncestors(elements, elementId);
    if (ancestors.length > 0) return ancestors[ancestors.length - 1].id;
    const el = findElementById(elementId, elements);
    if (el?.type === "group") return el.id;
    return null;
  };

  const enterGroupEditMode = (elementId: string, focusElementId?: string) => {
    const targetGroupId = getOutermostGroupId(elementId);
    if (!targetGroupId) return false;
    const group = findElementById(targetGroupId, elements);
    if (!group || !group.children || group.children.length === 0) return false;
    setElements((prev) => updateGroupBounds(prev, targetGroupId));
    setActiveGroupEdit(targetGroupId);
    setSelectedIds(new Set([targetGroupId]));
    if (
      focusElementId &&
      focusElementId !== targetGroupId &&
      isDescendantOfGroup(elements, targetGroupId, focusElementId)
    ) {
      setInnerEditSelectionId(focusElementId);
    } else {
      setInnerEditSelectionId(null);
    }
    return true;
  };

  const exitGroupEditMode = () => {
    setActiveGroupEdit(null);
    setInnerEditSelectionId(null);
    draggingInnerElement.current = false;
  };

  const updateGroupBounds = (
    list: VisualizerElement[],
    groupId: string
  ): VisualizerElement[] => {
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return list;
    const apply = (items: VisualizerElement[]): VisualizerElement[] => {
      return items.map((el) => {
        if (el.id === groupId && el.children && el.children.length > 0) {
          return recomputeGroupLayout(el, svgRect.width, svgRect.height);
        }
        if (el.children) return { ...el, children: apply(el.children) };
        return el;
      });
    };
    return apply(list);
  };

  const maybeSnapSplineEndpoints = (
    points: VisualizerElement["points"],
    movedIndex: number
  ) => {
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

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    el.points.forEach((p) => {
      minX = Math.min(
        minX,
        p.x + Math.min(0, p.handleIn?.x || 0, p.handleOut?.x || 0)
      );
      maxX = Math.max(
        maxX,
        p.x + Math.max(0, p.handleIn?.x || 0, p.handleOut?.x || 0)
      );
      minY = Math.min(
        minY,
        p.y + Math.min(0, p.handleIn?.y || 0, p.handleOut?.y || 0)
      );
      maxY = Math.max(
        maxY,
        p.y + Math.max(0, p.handleIn?.y || 0, p.handleOut?.y || 0)
      );
    });

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;

    // Normalize points relative to center (0,0)
    const newPoints = el.points.map((p) => ({
      x: p.x - centerX,
      y: p.y - centerY,
      handleIn: p.handleIn,
      handleOut: p.handleOut,
    }));

    const svgRect = svgRef.current?.getBoundingClientRect() || {
      width: 1000,
      height: 600,
    };
    const xPct = centerX / svgRect.width;
    const yPct = centerY / svgRect.height;

    return updateElementInList(list, id, {
      x: xPct,
      y: yPct,
      width,
      height,
      points: newPoints,
    });
  };

  const finishSpline = () => {
    if (!activeSplineId.current) return;
    const normalized = normalizeSpline(activeSplineId.current, elements);
    pushHistory(normalized);
    activeSplineId.current = null;
  };

  const handleSaveProject = () => {
    const project = {
      name: projectName,
      elements,
      fonts: customFonts,
      version: "1.0",
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, "-")}.json`;
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
        if (typeof content === "string") {
          const project = JSON.parse(content) as any;
          if (project.elements) {
            pushHistory(project.elements);
            if (Array.isArray(project.fonts)) {
              setCustomFonts(project.fonts);
            } else {
              setCustomFonts([]);
            }
            if (project.name) setProjectName(project.name);
            setSelectedIds(new Set());
          }
        }
      } catch (err) {
        alert("Invalid project file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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
        const shapeNode =
          el.type !== "group"
            ? (innerNode.querySelector(
                "[data-shape-root]"
              ) as SVGElement | null)
            : null;
        const isCustomShape = shapeNode?.hasAttribute("data-custom-shape");
        const baseCustomColor =
          shapeNode?.getAttribute("data-base-color") || "";
        const styleTarget = shapeNode || innerNode;

        let scale = 1,
          opacity = el.opacity,
          rot = el.rotation,
          xOff = 0,
          yOff = 0;
        let widthMult = 1,
          heightMult = 1;
        let layerCommand: string | null = null;
        let colorOverride: string | null = null;

        el.animationTracks.forEach((track) => {
          if (!track.enabled) return;
          let driverValue = 0;
          if (track.driver === "time") {
            driverValue = (now % track.duration) / track.duration;
          } else if (track.driver === "audio" && dataArray) {
            const startBin = Math.floor(track.frequencyRange[0] * bufferLength);
            const endBin = Math.floor(track.frequencyRange[1] * bufferLength);
            const safeEnd = Math.max(
              startBin + 1,
              Math.min(endBin, bufferLength)
            );
            let sum = 0;
            for (let k = startBin; k < safeEnd; k++) sum += dataArray[k];
            driverValue = sum / (safeEnd - startBin) / 255;
          }

          const output = interpolateKeyframes(track.keyframes, driverValue);

          if (track.target === "layer") {
            layerCommand = String(output);
          } else if (track.target === "color") {
            colorOverride = String(output);
          } else if (typeof output === "number") {
            switch (track.target) {
              case "scale":
                scale *= output;
                break;
              case "opacity":
                opacity *= output;
                break;
              case "rotation":
                rot += output;
                break;
              case "x":
                xOff += output;
                break;
              case "y":
                yOff += output;
                break;
              case "width":
                widthMult *= output;
                break;
              case "height":
                heightMult *= output;
                break;
            }
          }
        });

        const svgW = svgRef.current?.clientWidth || 1000;
        const svgH = svgRef.current?.clientHeight || 600;

        if (wrapper) {
          wrapper.style.transform = `translate(${xOff * svgW}px, ${
            yOff * svgH
          }px) rotate(${rot}deg) scale(${scale}, ${scale})`;
          if (widthMult !== 1 || heightMult !== 1)
            wrapper.style.transform += ` scale(${widthMult}, ${heightMult})`;
        }

        innerNode.style.opacity = `${Math.min(1, Math.max(0, opacity))}`;

        const fillColor = colorOverride || el.color;

        // Apply Color (If Gradient, we don't apply fill color unless overridden by animation, usually gradients are static in appearance)
        // But if animating 'color' target, we override the fill.
        if (el.type !== "group") {
          const strokeActive = isStrokeActive(el);
          const strokeColorString =
            colorOverride ?? el.strokeColor ?? fillColor;
          if (strokeActive) {
            if (colorOverride) styleTarget.style.stroke = strokeColorString;
            else styleTarget.style.removeProperty("stroke");
          } else {
            styleTarget.style.stroke = "none";
          }

          const fillActive = isFillActive(el);
          if (fillActive) {
            if (colorOverride) {
              styleTarget.style.fill = fillColor;
              if (isCustomShape && shapeNode) shapeNode.style.color = fillColor;
            } else {
              styleTarget.style.removeProperty("fill");
              if (isCustomShape && shapeNode) {
                if (baseCustomColor) shapeNode.style.color = baseCustomColor;
                else shapeNode.style.removeProperty("color");
              }
            }
          } else {
            styleTarget.style.fill = "none";
          }
        }

        if (el.type === "text") {
          const textNode = innerNode.querySelector<HTMLElement>(
            "[data-text-node]"
          );
          if (textNode) {
            textNode.style.color = colorOverride ?? el.color;
          }
        }

        // Handle Layer Animation (Direct DOM Manipulation)
        if (layerCommand && wrapper && wrapper.parentNode) {
          const container = wrapper.parentNode as Element;
          if (layerCommand === "front") {
            if (container.lastElementChild !== wrapper)
              container.appendChild(wrapper);
          } else if (layerCommand === "back") {
            if (container.firstElementChild !== wrapper)
              container.prepend(wrapper);
          } else if (layerCommand.startsWith("before:")) {
            const targetId = layerCommand.split(":")[1];
            const targetInner = elementRefs.current.get(targetId);
            const targetWrapper = targetInner?.parentNode as Node | null;
            if (
              targetWrapper &&
              targetWrapper.parentNode === container &&
              wrapper.nextSibling !== targetWrapper
            )
              container.insertBefore(wrapper, targetWrapper);
          } else if (layerCommand.startsWith("after:")) {
            const targetId = layerCommand.split(":")[1];
            const targetInner = elementRefs.current.get(targetId);
            const targetWrapper = targetInner?.parentNode as Node | null;
            if (
              targetWrapper &&
              targetWrapper.parentNode === container &&
              wrapper.previousSibling !== targetWrapper
            )
              container.insertBefore(wrapper, targetWrapper.nextSibling);
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
  const addElement = (
    type: ElementType,
    position?: { x: number; y: number }
  ) => {
    finishSpline();
    const isText = type === "text";
    const baseColor = isText ? "#1f2937" : "#3b82f6";
    const isLine = type === "line";
    const isFreeform = type === "freeform";
    const isSplineType = type === "spline";
    const isPathLike = isLine || isFreeform || isSplineType;
    const defaultFillEnabled =
      type === "group"
        ? false
        : !isLine && !isFreeform && !isSplineType && !isText;
    const defaultStrokeEnabled =
      type === "group" ? false : isPathLike && !isText;
    const defaultFontStack =
      availableFonts[0]?.fontFamily || "Inter, system-ui, sans-serif";
    const newEl: VisualizerElement = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
      x: position?.x ?? 0.5,
      y: position?.y ?? 0.5,
      width: isText ? 360 : 100,
      height: isLine ? 4 : isText ? 140 : 100,
      color: baseColor,
      fillType: "solid",
      gradient: { start: baseColor, end: baseColor, angle: 90, type: "linear" },
      fillEnabled: defaultFillEnabled,
      strokeEnabled: defaultStrokeEnabled,
      strokeColor: baseColor,
      strokeWidth: isLine ? 4 : 2,
      strokeFillType: "solid",
      rotation: 0,
      opacity: 1,
      animationTracks: [],
      children: type === "group" ? [] : undefined,
    };

    if (isText) {
      newEl.name = "Text";
      newEl.fillEnabled = false;
      newEl.strokeEnabled = false;
      newEl.strokeWidth = 0;
      newEl.textContent = "Text";
      newEl.fontFamily = defaultFontStack;
      newEl.fontSize = 64;
      newEl.fontWeight = 600;
      newEl.textAlign = "center";
      newEl.letterSpacing = 0;
      newEl.lineHeight = 1.1;
    }
    pushHistory([...elements, newEl]);
    setSelectedIds(new Set([newEl.id]));
  };

  const importAssetFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const list = Array.isArray(files)
      ? files
      : Array.from(files as FileList);
    const additions: VisualizerElement[] = [];
    for (const file of list) {
      if (!isSupportedAsset(file)) {
        console.warn(`${file.name} is not a supported image or SVG.`);
        continue;
      }
      if (file.size > MAX_ASSET_SIZE_BYTES) {
        alert(`${file.name} is too large. Max file size is 20MB.`);
        continue;
      }
      const baseName = file.name.replace(/\.[^/.]+$/, "") || "Asset";
      try {
        if (isSvgFile(file)) {
          const text = await readFileAsText(file);
          const sanitized = sanitizeSvgMarkup(text);
          if (!sanitized) {
            alert(`${file.name} is not a valid SVG.`);
            continue;
          }
          const newEl: VisualizerElement = {
            id: Math.random().toString(36).substring(2, 11),
            type: "custom",
            name: baseName,
            x: 0.5,
            y: 0.5,
            width: 120,
            height: 120,
            color: "#3b82f6",
            fillType: "solid",
            gradient: {
              start: "#3b82f6",
              end: "#3b82f6",
              angle: 90,
              type: "linear",
            },
            fillEnabled: true,
            strokeEnabled: false,
            strokeColor: "#3b82f6",
            strokeWidth: 2,
            strokeFillType: "solid",
            rotation: 0,
            opacity: 1,
            animationTracks: [],
            svgContent: sanitized.inner,
            viewBox: sanitized.viewBox,
            originalFileName: file.name,
            mimeType: file.type || "image/svg+xml",
          };
          additions.push(newEl);
        } else {
          const dataUrl = await readFileAsDataUrl(file);
          if (!dataUrl.startsWith("data:image")) {
            console.warn(`Skipping unsupported data URL for ${file.name}`);
            continue;
          }
          const dims = await getImageDimensions(dataUrl);
          const { width, height } = clampAssetDimensions(
            dims.width,
            dims.height
          );
          const newEl: VisualizerElement = {
            id: Math.random().toString(36).substring(2, 11),
            type: "image",
            name: baseName,
            x: 0.5,
            y: 0.5,
            width,
            height,
            color: "#ffffff",
            fillType: "solid",
            gradient: {
              start: "#ffffff",
              end: "#ffffff",
              angle: 0,
              type: "linear",
            },
            fillEnabled: false,
            strokeEnabled: false,
            strokeWidth: 0,
            strokeFillType: "solid",
            rotation: 0,
            opacity: 1,
            animationTracks: [],
            imageSrc: dataUrl,
            mimeType: file.type || undefined,
            originalFileName: file.name,
            intrinsicWidth: dims.width,
            intrinsicHeight: dims.height,
          };
          additions.push(newEl);
        }
      } catch (error) {
        console.error(`Failed to import ${file.name}`, error);
      }
    }
    if (additions.length === 0) return;
    const newElements = [...elements, ...additions];
    pushHistory(newElements);
    setSelectedIds(new Set([additions[additions.length - 1].id]));
  };

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await importAssetFiles(e.target.files);
    e.target.value = "";
  };

  const handleAssetDrop = async (files: FileList) => {
    await importAssetFiles(files);
  };

  const handleFontUpload = async (
    files: FileList | null,
    targetElementId?: string
  ) => {
    if (!files || files.length === 0) return;
    const uploads = Array.from(files);
    const nextFonts: WorkspaceFont[] = [];
    for (const file of uploads) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (!SUPPORTED_FONT_EXTENSIONS.has(ext)) {
        console.warn(`${file.name} is not a supported font type.`);
        continue;
      }
      if (file.size > MAX_FONT_SIZE_BYTES) {
        alert(`${file.name} is too large. Max font size is 15MB.`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const baseName = file.name.replace(/\.[^/.]+$/, "") || "Custom Font";
        const fontId = `font_${randomId()}`;
        const normalized =
          baseName.replace(/[^a-z0-9]+/gi, "").slice(0, 24) || "Font";
        const fontFamily = `RF_${normalized}_${fontId}`;
        nextFonts.push({ id: fontId, name: baseName, fontFamily, dataUrl });
      } catch (err) {
        console.error(`Failed to load font ${file.name}`, err);
      }
    }
    if (nextFonts.length === 0) return;
    setCustomFonts((prev) => [...prev, ...nextFonts]);

    if (targetElementId) {
      const fontToApply = nextFonts[nextFonts.length - 1];
      const target = findElementById(targetElementId, elements);
      if (target && target.type === "text") {
        const updated = updateElementInList(elements, targetElementId, {
          fontFamily: fontToApply.fontFamily,
        });
        pushHistory(updated);
      }
    }
  };

  const handleCanvasPresetSelect = (presetId: string) => {
    const preset = CANVAS_SIZE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setCanvasPresetId(presetId);
    setCanvasScale(1);
    setCanvasOffset({ x: 0, y: 0 });
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    let newElements = [...elements];
    selectedIds.forEach((id) => {
      newElements = removeElementFromList(newElements, id);
    });
    pushHistory(newElements);
    setSelectedIds(new Set());
    setActiveGroupEdit(null);
    setInnerEditSelectionId(null);
    activeSplineId.current = null;
  };

  const handleGroup = () => {
    if (selectedIds.size < 2) return;
    finishSpline();
    const selectedEls: VisualizerElement[] = [];
    const remainingEls: VisualizerElement[] = [];
    elements.forEach((el) => {
      if (selectedIds.has(el.id)) selectedEls.push(el);
      else remainingEls.push(el);
    });
    if (selectedEls.length === 0) return;

    const svgRect = svgRef.current?.getBoundingClientRect();
    const svgW = svgRect?.width || 1;
    const svgH = svgRect?.height || 1;

    let minL = Infinity,
      minT = Infinity,
      maxR = -Infinity,
      maxB = -Infinity;
    selectedEls.forEach((el) => {
      const px = el.x * svgW;
      const py = el.y * svgH;
      const halfW = el.width / 2;
      const halfH = el.height / 2;
      minL = Math.min(minL, px - halfW);
      minT = Math.min(minT, py - halfH);
      maxR = Math.max(maxR, px + halfW);
      maxB = Math.max(maxB, py + halfH);
    });

    if (
      !Number.isFinite(minL) ||
      !Number.isFinite(minT) ||
      !Number.isFinite(maxR) ||
      !Number.isFinite(maxB)
    )
      return;

    const centerX = (minL + maxR) / 2 / svgW;
    const centerY = (minT + maxB) / 2 / svgH;
    const groupWidth = Math.max(10, maxR - minL);
    const groupHeight = Math.max(10, maxB - minT);
    const children = selectedEls.map((el) => ({
      ...el,
      x: el.x - centerX,
      y: el.y - centerY,
    }));

    const groupEl: VisualizerElement = {
      id: Math.random().toString(36).substring(2, 11),
      type: "group",
      name: "Group",
      x: centerX,
      y: centerY,
      width: groupWidth,
      height: groupHeight,
      color: "#ffffff",
      fillType: "solid",
      gradient: {
        start: "#ffffff",
        end: "#ffffff",
        angle: 90,
        type: "linear",
      },
      fillEnabled: false,
      strokeEnabled: false,
      strokeColor: "#ffffff",
      strokeWidth: 2,
      strokeFillType: "solid",
      rotation: 0,
      opacity: 1,
      animationTracks: [],
      children,
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
    elements.forEach((el) => {
      if (selectedIds.has(el.id)) selectedEls.push(el);
      else remainingEls.push(el);
    });

    if (selectedEls.length < 2) return;

    const rect = svgRef.current.getBoundingClientRect();
    const mergedEl = generateMergedElement(
      selectedEls,
      rect.width,
      rect.height
    );

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
    elements.forEach((el) => {
      if (selectedIds.has(el.id)) selectedEls.push(el);
      else remainingEls.push(el);
    });

    if (selectedEls.length < 2) return;

    const rect = svgRef.current.getBoundingClientRect();
    const subtractedEl = generateSubtractedElement(
      selectedEls,
      rect.width,
      rect.height
    );

    if (subtractedEl) {
      pushHistory([...remainingEls, subtractedEl]);
      setSelectedIds(new Set([subtractedEl.id]));
    }
  };

  const handleUngroup = () => {
    if (selectedIds.size !== 1) return;
    const id = Array.from(selectedIds)[0] as string;
    const group = elements.find((e) => e.id === id);
    if (!group || group.type !== "group" || !group.children) return;
    const unpacked = group.children.map((child) => ({
      ...child,
      x: group.x + child.x,
      y: group.y + child.y,
      rotation: group.rotation + child.rotation,
    }));
    pushHistory([...elements.filter((e) => e.id !== id), ...unpacked]);
    setSelectedIds(new Set(unpacked.map((e) => e.id)));
    if (activeGroupEdit === id) exitGroupEditMode();
  };

  const handleAlign = (alignment: Alignment) => {
    if (selectedIds.size < 2 || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgW = rect.width;
    const svgH = rect.height;

    // Helper to traverse and collect currently selected items
    const selectedEls: VisualizerElement[] = [];
    const collect = (list: VisualizerElement[]) =>
      list.forEach((el) => {
        if (selectedIds.has(el.id)) selectedEls.push(el);
        if (el.children) collect(el.children);
      });
    collect(elements);

    if (selectedEls.length < 2) return;

    // Calculate bounds of the selection
    let minL = Infinity,
      maxR = -Infinity,
      minT = Infinity,
      maxB = -Infinity;
    selectedEls.forEach((el) => {
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
      return list.map((el) => {
        if (selectedIds.has(el.id)) {
          let newX = el.x;
          let newY = el.y;
          const px = el.x * svgW;
          const py = el.y * svgH;
          const halfW = el.width / 2;
          const halfH = el.height / 2;

          switch (alignment) {
            case "left":
              newX = (minL + halfW) / svgW;
              break;
            case "center":
              newX = midX / svgW;
              break;
            case "right":
              newX = (maxR - halfW) / svgW;
              break;
            case "top":
              newY = (minT + halfH) / svgH;
              break;
            case "middle":
              newY = midY / svgH;
              break;
            case "bottom":
              newY = (maxB - halfH) / svgH;
              break;
          }

          const updated = { ...el, x: newX, y: newY };
          if (el.children)
            return { ...updated, children: updateList(el.children) };
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
      .map((id) => {
        const path = findElementPath(elements, id);
        return path ? { id, path } : null;
      })
      .filter((entry): entry is { id: string; path: number[] } => !!entry);

    if (selectionWithPaths.length === 0) return;

    const sorted = [...selectionWithPaths].sort((a, b) =>
      comparePaths(a.path, b.path)
    );
    const actionConfig: Record<
      LayerAction,
      { direction: LayerShift; order: "asc" | "desc" }
    > = {
      "bring-to-front": { direction: "front", order: "asc" },
      "send-to-back": { direction: "back", order: "desc" },
      "bring-forward": { direction: "forward", order: "desc" },
      "send-backward": { direction: "backward", order: "asc" },
    };

    const { direction, order } = actionConfig[action];
    const orderedEntries = order === "asc" ? sorted : [...sorted].reverse();

    let updated = elements;
    orderedEntries.forEach(({ id }) => {
      updated = changeElementLayer(updated, id, direction);
    });

    if (updated !== elements) pushHistory(updated);
  };

  const handleLayerReorder = (
    sourceId: string,
    targetId: string,
    position: "before" | "after"
  ) => {
    const reordered = moveElementRelative(
      elements,
      sourceId,
      targetId,
      position
    );
    if (reordered !== elements) pushHistory(reordered);
  };

  const addSplinePoint = (
    elId: string,
    pointIndex: number,
    newPoint: { x: number; y: number }
  ) => {
    setElements((prev) =>
      updateElementInList(prev, elId, {
        points: [
          ...(findElementById(elId, prev)?.points?.slice(0, pointIndex + 1) ||
            []),
          newPoint,
          ...(findElementById(elId, prev)?.points?.slice(pointIndex + 1) || []),
        ],
      })
    );
  };

  const deleteSplinePoint = (elId: string, pointIndex: number) => {
    const el = findElementById(elId, elements);
    if (!el || !el.points || el.points.length <= 2) return;
    const newPoints = el.points.filter((_, i) => i !== pointIndex);
    setElements((prev) =>
      updateElementInList(prev, elId, { points: newPoints })
    );
  };

  const resumeSplineEditing = () => {
    if (selectedIds.size !== 1) return;
    const id = Array.from(selectedIds)[0] as string;
    const el = findElementById(id, elements);
    if (el && el.type === "spline") {
      activeSplineId.current = id;
      setToolMode("spline");
      setSelectedIds(new Set());
    }
  };

  const removeLastSplinePoint = () => {
    if (selectedIds.size !== 1) return;
    const id = Array.from(selectedIds)[0] as string;
    const el = findElementById(id, elements);
    if (el && el.type === "spline" && el.points && el.points.length > 0) {
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
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }
      const key = e.key.toLowerCase();
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if (e.key === "Escape") {
        if (toolMode === "spline") {
          finishSpline();
          setToolMode("pointer");
        } else if (toolMode === "text") {
          setToolMode("pointer");
        } else if (activeGroupEdit) {
          const currentGroup = activeGroupEdit;
          exitGroupEditMode();
          setSelectedIds(new Set([currentGroup]));
        } else {
          setSelectedIds(new Set());
        }
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
      if ((e.ctrlKey || e.metaKey) && key === "c" && selectedIds.size > 0) {
        const lastId = Array.from(selectedIds).pop() as string;
        if (lastId) {
          const el = findElementById(lastId, elements);
          if (el) setClipboard(el);
        }
      }
      if ((e.ctrlKey || e.metaKey) && key === "v" && clipboard) {
        e.preventDefault();
        finishSpline();
        const clone = cloneElementWithNewIds(clipboard);
        const newEl = {
          ...clone,
          x: clone.x + 0.03,
          y: clone.y + 0.03,
          name: `${clone.name} Copy`,
        };
        pushHistory([...elements, newEl]);
        setSelectedIds(new Set([newEl.id]));
      }
      if ((e.ctrlKey || e.metaKey) && key === "g") {
        e.preventDefault();
        handleGroup();
      }
      if ((e.ctrlKey || e.metaKey) && key === "u") {
        e.preventDefault();
        handleUngroup();
      }
      if ((e.ctrlKey || e.metaKey) && key === "z") e.shiftKey ? redo() : undo();
      if ((e.ctrlKey || e.metaKey) && key === "y") redo();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedIds,
    clipboard,
    elements,
    historyLength,
    redoStackLength,
    toolMode,
    activeGroupEdit,
  ]);

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsSpacePressed(false);
    };
    window.addEventListener("keyup", handleKeyUp);
    return () => window.removeEventListener("keyup", handleKeyUp);
  }, []);

  useEffect(() => {
    if (!isSpacePressed && dragMode.current === "pan") {
      dragMode.current = null;
      panStartRef.current = null;
      setIsPanning(false);
    }
  }, [isSpacePressed]);

  const handleContextMenu = (e: React.MouseEvent, id?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (id) {
      const targetId = getOutermostGroupId(id) ?? id;
      if (!selectedIds.has(targetId)) setSelectedIds(new Set([targetId]));
      if (
        activeGroupEdit &&
        !isDescendantOfGroup(elements, activeGroupEdit, id)
      ) {
        exitGroupEditMode();
      }
    } else if (activeGroupEdit) {
      exitGroupEditMode();
    }
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  };

  const handleSVGMouseDown = (
    e: React.MouseEvent,
    mode: DragMode,
    id?: string
  ) => {
    if (e.button === 0) {
      e.stopPropagation();
      setContextMenu((prev) => ({ ...prev, visible: false }));
      draggingInnerElement.current = false;

      if (isSpacePressed) {
        dragMode.current = "pan";
        panStartRef.current = { x: e.clientX, y: e.clientY };
        panOffsetRef.current = { ...canvasOffset };
        setIsPanning(true);
        return;
      }

      if (
        mode === "edit-point" ||
        mode === "edit-handle-in" ||
        mode === "edit-handle-out"
      ) {
        dragMode.current = mode;
        startPos.current = { x: e.clientX, y: e.clientY };
        return;
      }

      const elementIdFromNode =
        (e.currentTarget as HTMLElement | null)?.getAttribute?.(
          "data-element-id"
        ) || undefined;
      const rawId = id ?? elementIdFromNode;

      if (toolMode === "freeform" && svgRef.current) {
        isDrawing.current = true;
        const rect = svgRef.current.getBoundingClientRect();
        const newEl: VisualizerElement = {
          id: Math.random().toString(36).substring(2, 11),
          type: "freeform",
          name: "Freeform Line",
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          color: "#3b82f6",
          fillType: "solid",
          gradient: {
            start: "#3b82f6",
            end: "#3b82f6",
            angle: 90,
            type: "linear",
          },
          fillEnabled: false,
          strokeEnabled: true,
          strokeColor: "#3b82f6",
          strokeWidth: 2,
          strokeFillType: "solid",
          rotation: 0,
          opacity: 1,
          animationTracks: [],
          points: [{ x: e.clientX - rect.left, y: e.clientY - rect.top }],
        };
        drawingId.current = newEl.id;
        setElements((prev) => [...prev, newEl]);
        return;
      }
      if (toolMode === "spline" && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (!activeSplineId.current) {
          const newEl: VisualizerElement = {
            id: Math.random().toString(36).substring(2, 11),
            type: "spline",
            name: "Spline Curve",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            color: "#3b82f6",
            fillType: "solid",
            gradient: {
              start: "#3b82f6",
              end: "#3b82f6",
              angle: 90,
              type: "linear",
            },
            fillEnabled: false,
            strokeEnabled: true,
            strokeColor: "#3b82f6",
            strokeWidth: 2,
            strokeFillType: "solid",
            rotation: 0,
            opacity: 1,
            animationTracks: [],
            isClosed: false,
            points: [
              { x, y, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
            ],
          };
          activeSplineId.current = newEl.id;
          setElements((prev) => [...prev, newEl]);
          setSelectedIds(new Set([newEl.id]));
        } else {
          let closedBySnap = false;
          setElements((prev) => {
            const el = findElementById(activeSplineId.current!, prev);
            if (!el) return prev;
            if (el.isClosed) {
              closedBySnap = true;
              return prev;
            }
            const existingPoints = el.points || [];
            if (existingPoints.length >= 2) {
              const first = existingPoints[0];
              const dist = Math.hypot(x - first.x, y - first.y);
              if (dist <= SPLINE_CLOSE_DISTANCE) {
                closedBySnap = true;
                return updateElementInList(prev, el.id, { isClosed: true });
              }
            }
            const newPoints = [
              ...existingPoints,
              { x, y, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 } },
            ];
            return updateElementInList(prev, el.id, { points: newPoints });
          });
          if (closedBySnap) {
            dragMode.current = null;
            return;
          }
        }
        dragMode.current = "create-tangent";
        startPos.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (!id && !mode) {
        if (toolMode === "text" && svgRef.current) {
          const rect = svgRef.current.getBoundingClientRect();
          const normX = (e.clientX - rect.left) / rect.width;
          const normY = (e.clientY - rect.top) / rect.height;
          addElement("text", { x: normX, y: normY });
          setToolMode("pointer");
          return;
        }
        // Background Click
        if (toolMode === "pointer") {
          finishSpline();
          setContextMenu((prev) => ({ ...prev, visible: false }));
          if (activeGroupEdit) exitGroupEditMode();

          // Start Marquee Selection if SVG available
          if (svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setSelectionBox({
              startX: x,
              startY: y,
              currentX: x,
              currentY: y,
              visible: true,
            });
            dragMode.current = "marquee";

            // Standard behavior: clear selection unless Shift is held (Additive)
            if (!e.shiftKey) {
              setSelectedIds(new Set());
            }
          }
        }
        return;
      }

      if (!rawId) {
        if (activeGroupEdit) exitGroupEditMode();
        if (!mode && toolMode === "pointer") {
          finishSpline();
          setContextMenu((prev) => ({ ...prev, visible: false }));

          if (svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setSelectionBox({
              startX: x,
              startY: y,
              currentX: x,
              currentY: y,
              visible: true,
            });
            dragMode.current = "marquee";

            if (!e.shiftKey) {
              setSelectedIds(new Set());
            }
          }
        }
        return;
      }

      if (toolMode === "pointer" && e.detail === 2) {
        if (enterGroupEditMode(rawId, rawId)) return;
      }

      const editingWithinGroup = !!(
        activeGroupEdit && isDescendantOfGroup(elements, activeGroupEdit, rawId)
      );
      if (activeGroupEdit && !editingWithinGroup) {
        exitGroupEditMode();
      }
      const outerGroupId = getOutermostGroupId(rawId);
      let selectionTargetId = outerGroupId ?? rawId;
      if (editingWithinGroup && activeGroupEdit)
        selectionTargetId = activeGroupEdit;

      if (toolMode === "pointer" && (e.ctrlKey || e.metaKey)) {
        /* combination handled below */
      }

      if (editingWithinGroup && rawId && rawId !== selectionTargetId) {
        setInnerEditSelectionId(rawId);
      } else if (!editingWithinGroup) {
        setInnerEditSelectionId(null);
      }

      if (editingWithinGroup) {
        setSelectedIds(new Set([selectionTargetId]));
      } else if (e.shiftKey) {
        const newSet = new Set(selectedIds);
        if (newSet.has(selectionTargetId)) newSet.delete(selectionTargetId);
        else newSet.add(selectionTargetId);
        setSelectedIds(newSet);
      } else {
        if (!selectedIds.has(selectionTargetId))
          setSelectedIds(new Set([selectionTargetId]));
      }

      startEls.current.clear();
      const allElements = flattenElementsList(elements);

      const dragTargetId = editingWithinGroup ? rawId : selectionTargetId;
      const dragSet = editingWithinGroup
        ? new Set([dragTargetId])
        : selectedIds.has(selectionTargetId) && !e.shiftKey
        ? selectedIds
        : new Set([selectionTargetId]);
      draggingInnerElement.current =
        editingWithinGroup && dragTargetId !== selectionTargetId;

      dragSet.forEach((selId) => {
        const el = allElements.find((x) => x.id === selId);
        if (el) startEls.current.set(selId, { ...el });
      });
      if (editingWithinGroup && dragSet.size === 0) {
        const el = allElements.find((x) => x.id === dragTargetId);
        if (el) startEls.current.set(dragTargetId, { ...el });
      }
      dragMode.current = mode;
      startPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragMode.current === "pan" && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setCanvasOffset({
        x: panOffsetRef.current.x + dx,
        y: panOffsetRef.current.y + dy,
      });
      return;
    }
    // Marquee Drag
    if (dragMode.current === "marquee" && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      setSelectionBox((prev) => ({ ...prev, currentX, currentY }));
      return;
    }

    if (
      toolMode === "freeform" &&
      isDrawing.current &&
      drawingId.current &&
      svgRef.current
    ) {
      const rect = svgRef.current.getBoundingClientRect();
      setElements((prev) =>
        prev.map((el) =>
          el.id === drawingId.current
            ? {
                ...el,
                points: [
                  ...(el.points || []),
                  { x: e.clientX - rect.left, y: e.clientY - rect.top },
                ],
              }
            : el
        )
      );
      return;
    }
    if (dragMode.current === "create-tangent" && activeSplineId.current) {
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      setElements((prev) => {
        const el = findElementById(activeSplineId.current!, prev);
        if (!el || !el.points) return prev;
        const newPoints = [...el.points];
        const lastIdx = newPoints.length - 1;
        newPoints[lastIdx] = {
          ...newPoints[lastIdx],
          handleOut: { x: dx, y: dy },
          handleIn: { x: -dx, y: -dy },
        };
        return updateElementInList(prev, activeSplineId.current!, {
          points: newPoints,
        });
      });
      return;
    }
    if (
      (dragMode.current === "edit-point" ||
        dragMode.current === "edit-handle-in" ||
        dragMode.current === "edit-handle-out") &&
      editPointTarget.current
    ) {
      const { elementId, pointIndex, type } = editPointTarget.current;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      startPos.current = { x: e.clientX, y: e.clientY };
      setElements((prev) => {
        const el = findElementById(elementId, prev);
        if (!el || !el.points) return prev;
        const newPoints = [...el.points];
        const p = newPoints[pointIndex];
        let closedBySnap = false;
        if (type === "anchor") {
          newPoints[pointIndex] = { ...p, x: p.x + dx, y: p.y + dy };
          if (!el.isClosed) {
            closedBySnap = maybeSnapSplineEndpoints(newPoints, pointIndex);
          }
        } else if (type === "out") {
          newPoints[pointIndex] = {
            ...p,
            handleOut: {
              x: (p.handleOut?.x || 0) + dx,
              y: (p.handleOut?.y || 0) + dy,
            },
          };
          if (!e.altKey)
            newPoints[pointIndex].handleIn = {
              x: -newPoints[pointIndex].handleOut!.x,
              y: -newPoints[pointIndex].handleOut!.y,
            };
        } else if (type === "in") {
          newPoints[pointIndex] = {
            ...p,
            handleIn: {
              x: (p.handleIn?.x || 0) + dx,
              y: (p.handleIn?.y || 0) + dy,
            },
          };
          if (!e.altKey)
            newPoints[pointIndex].handleOut = {
              x: -newPoints[pointIndex].handleIn!.x,
              y: -newPoints[pointIndex].handleIn!.y,
            };
        }
        const update: Partial<VisualizerElement> = { points: newPoints };
        if (closedBySnap) update.isClosed = true;
        return updateElementInList(prev, elementId, update);
      });
      return;
    }

    if (!dragMode.current || startEls.current.size === 0 || !svgRef.current)
      return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const svgRect = svgRef.current.getBoundingClientRect();

    let newElements = [...elements];
    const updateTree = (
      list: VisualizerElement[],
      id: string,
      fn: (el: VisualizerElement) => Partial<VisualizerElement>
    ): VisualizerElement[] => {
      return list.map((el) => {
        if (el.id === id) return { ...el, ...fn(el) };
        if (el.children)
          return { ...el, children: updateTree(el.children, id, fn) };
        return el;
      });
    };

    let appliedDx = dx;
    let appliedDy = dy;

    if (
      dragMode.current === "move" &&
      e.shiftKey &&
      startEls.current.size === 1
    ) {
      const entry = startEls.current.entries().next().value as
        | [string, VisualizerElement]
        | undefined;
      if (entry) {
        const [movingId, startEl] = entry;
        const snapResult = computeSnapForMove({
          dx,
          dy,
          svgRect,
          start: startEl,
          elements: flattenElementsList(elements),
          movingId,
          gridVariant,
          enableGridSnap: showGrid,
        });
        appliedDx = snapResult.dx;
        appliedDy = snapResult.dy;
        setSnapGuides(snapResult.guides);
      } else if (snapGuides) {
        setSnapGuides(null);
      }
    } else if (snapGuides) {
      setSnapGuides(null);
    }

    startEls.current.forEach((start, id) => {
      if (dragMode.current === "move") {
        newElements = updateTree(newElements, id, () => ({
          x: start.x + appliedDx / svgRect.width,
          y: start.y + appliedDy / svgRect.height,
        }));
      } else if (selectedIds.size === 1) {
        const updates = computeResizeWithAspect(
          dragMode.current,
          start,
          dx,
          dy,
          svgRect,
          e.shiftKey
        );
        if (updates) {
          newElements = updateTree(newElements, id, () => updates);
        }
      }
    });
    const applied =
      activeGroupEdit && draggingInnerElement.current
        ? updateGroupBounds(newElements, activeGroupEdit)
        : newElements;
    setElements(applied);
  };

  const handleMouseUp = () => {
    if (snapGuides) setSnapGuides(null);
    if (dragMode.current === "pan") {
      dragMode.current = null;
      panStartRef.current = null;
      setIsPanning(false);
      draggingInnerElement.current = false;
      return;
    }
    if (dragMode.current === "marquee") {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const boxX = Math.min(selectionBox.startX, selectionBox.currentX);
        const boxY = Math.min(selectionBox.startY, selectionBox.currentY);
        const boxW = Math.abs(selectionBox.currentX - selectionBox.startX);
        const boxH = Math.abs(selectionBox.currentY - selectionBox.startY);

        // Start with current selection (if Shift was held/preserved), or empty (if cleared)
        const newSelected = new Set(selectedIds);

        const checkIntersection = (list: VisualizerElement[]) => {
          list.forEach((el) => {
            const elX = el.x * rect.width;
            const elY = el.y * rect.height;
            // Simple point check for center
            if (
              elX >= boxX &&
              elX <= boxX + boxW &&
              elY >= boxY &&
              elY <= boxY + boxH
            ) {
              newSelected.add(el.id);
            }
            if (el.children) checkIntersection(el.children);
          });
        };
        checkIntersection(elements);
        setSelectedIds(newSelected);
      }
      setSelectionBox((prev) => ({ ...prev, visible: false }));
      dragMode.current = null;
      // No need to reset toolMode as it stays 'pointer'
      return;
    }

    if (
      toolMode === "freeform" &&
      isDrawing.current &&
      drawingId.current &&
      svgRef.current
    ) {
      isDrawing.current = false;
      const normalizeEl = (el: VisualizerElement): VisualizerElement => {
        if (el.id === drawingId.current && el.points && el.points.length > 0) {
          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
          el.points.forEach((p) => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          });
          const width = maxX - minX;
          const height = maxY - minY;
          const centerX = minX + width / 2;
          const centerY = minY + height / 2;
          return {
            ...el,
            x: centerX / svgRef.current!.getBoundingClientRect().width,
            y: centerY / svgRef.current!.getBoundingClientRect().height,
            width: Math.max(10, width),
            height: Math.max(10, height),
            points: el.points.map((p) => ({
              x: p.x - centerX,
              y: p.y - centerY,
            })),
          };
        }
        return el;
      };
      const newElements = elements.map(normalizeEl);
      pushHistory(newElements);
      setSelectedIds(new Set([drawingId.current]));
      drawingId.current = null;
      setToolMode("pointer");
      return;
    }
    if (toolMode === "spline" && dragMode.current === "create-tangent") {
      dragMode.current = null;
      return;
    }
    if (dragMode.current && dragMode.current.startsWith("edit-")) {
      dragMode.current = null;
      editPointTarget.current = null;
      return;
    }
    dragMode.current = null;
    startEls.current.clear();
    draggingInnerElement.current = false;
  };

  const handleSplinePointMouseDown = (
    e: React.MouseEvent,
    elId: string,
    idx: number,
    type: "anchor" | "in" | "out"
  ) => {
    e.stopPropagation();
    if (type === "anchor" && (e.ctrlKey || e.metaKey)) {
      deleteSplinePoint(elId, idx);
    } else {
      editPointTarget.current = { elementId: elId, pointIndex: idx, type };
      handleSVGMouseDown(
        e,
        type === "anchor"
          ? "edit-point"
          : type === "in"
          ? "edit-handle-in"
          : "edit-handle-out",
        elId
      );
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isSpacePressed || !svgRef.current) return;
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    const delta = -e.deltaY * 0.001;
    setCanvasScale((prevScale) => {
      const raw = prevScale * (1 + delta);
      const nextScale = Math.min(4, Math.max(0.25, raw));
      if (nextScale === prevScale) return prevScale;
      setCanvasOffset((prevOffset) => {
        const scaleRatio = nextScale / prevScale;
        return {
          x: prevOffset.x + pointerX * (1 - scaleRatio),
          y: prevOffset.y + pointerY * (1 - scaleRatio),
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
    <div
      className="flex flex-col h-full w-full bg-zinc-100 dark:bg-zinc-950 transition-colors relative overflow-hidden text-zinc-900 dark:text-zinc-100 p-4"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() =>
            setContextMenu((prev) => ({ ...prev, visible: false }))
          }
          onCopy={() => {
            if (selectedIds.size === 1) {
              const id = Array.from(selectedIds)[0] as string;
              const el = findElementById(id, elements);
              if (el) setClipboard(el);
            }
          }}
          onDelete={deleteSelected}
          onAlign={handleAlign}
          onLayerAction={handleLayerAction}
          selectedElement={
            selectedIds.size === 1
              ? findElementById(Array.from(selectedIds)[0] as string, elements)
              : undefined
          }
          selectedCount={selectedIds.size}
        />
      )}

      <div className="w-full h-full max-w-[1920px] mx-auto bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative border border-zinc-200/50 dark:border-zinc-800/50">
        <WorkspaceHeader
          onClose={onClose}
          undo={undo}
          redo={redo}
          historyLength={historyLength}
          redoStackLength={redoStackLength}
          projectName={projectName}
          setProjectName={setProjectName}
          onSave={handleSaveProject}
          onImport={handleImportProject}
          toolMode={toolMode}
          setToolMode={setToolMode}
          onGroup={handleGroup}
          onUngroup={handleUngroup}
          onUnion={handleMerge}
          onSubtract={handleSubtract}
          addElement={addElement}
          onAssetUpload={handleAssetUpload}
          selectedSplineId={
            selectedIds.size === 1 &&
            findElementById(Array.from(selectedIds)[0] as string, elements)
              ?.type === "spline"
              ? (Array.from(selectedIds)[0] as string)
              : undefined
          }
          resumeSplineEditing={resumeSplineEditing}
          removeLastSplinePoint={removeLastSplinePoint}
          isPanMode={isSpacePressed}
          onResetView={resetCanvasView}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid((prev) => !prev)}
          gridVariant={gridVariant}
          onSelectGridVariant={setGridVariant}
          canvasSize={activeCanvasPreset}
          canvasPresets={CANVAS_SIZE_PRESETS}
          selectedCanvasPresetId={canvasPresetId}
          onCanvasPresetSelect={handleCanvasPresetSelect}
        />

        <div className="flex-1 flex overflow-hidden">
          <WorkspaceLayers
            elements={elements}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            toolMode={toolMode}
            onReorderLayer={handleLayerReorder}
            innerSelectionId={innerEditSelectionId}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            trackTitle={trackTitle}
            sourceType={sourceType}
            setSourceType={setSourceType}
            volume={volume}
            setVolume={setVolume}
            onFileUpload={handleFileUpload}
            onTabShare={handleTabShare}
            graphEnabled={graphEnabled}
            setGraphEnabled={setGraphEnabled}
            onAssetDrop={handleAssetDrop}
          />

          {/* Center Area: Canvas + Footer */}
          <div className="flex-1 flex flex-col relative min-w-0">
            {/* Canvas Container */}
            <div className="flex-1 relative">
              <WorkspaceCanvas
                svgRef={svgRef}
                elementRefs={elementRefs}
                elements={elements}
                selectedIds={selectedIds}
                activeGroupEditId={activeGroupEdit}
                innerSelectionId={innerEditSelectionId}
                onMouseDown={handleSVGMouseDown}
                onContextMenu={handleContextMenu}
                onSplinePointMouseDown={handleSplinePointMouseDown}
                selectionBox={selectionBox}
                canvasScale={canvasScale}
                canvasOffset={canvasOffset}
                isPanning={isPanning}
                isSpacePressed={isSpacePressed}
                showGrid={showGrid}
                gridVariant={gridVariant}
                snapGuides={snapGuides}
                canvasWidth={activeCanvasPreset.width}
                canvasHeight={activeCanvasPreset.height}
              />
            </div>

            {/* Footer Container - Static below canvas */}
            <div className="shrink-0 p-4 flex justify-center z-20 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
              <WorkspaceFooter
                analyserRef={analyserRef}
                isPlaying={isPlaying}
                graphEnabled={graphEnabled}
              />
            </div>
          </div>

          <WorkspaceProperties
            selectedIds={selectedIds}
            elements={elements}
            innerSelectionId={innerEditSelectionId}
            onUpdate={(id, u) => {
              const newEls = updateElementInList(elements, id, u);
              pushHistory(newEls);
            }}
            onGroup={handleGroup}
            fonts={availableFonts}
            onFontUpload={handleFontUpload}
          />
        </div>
      </div>
    </div>
  );
};

export default Workspace;
