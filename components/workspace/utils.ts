import { VisualizerElement } from "../../types";

// Helper: Hex to HSL
export const hexToHSL = (H: string) => {
  let r = 0,
    g = 0,
    b = 0;
  if (H.length === 4) {
    r = parseInt("0x" + H[1] + H[1]);
    g = parseInt("0x" + H[2] + H[2]);
    b = parseInt("0x" + H[3] + H[3]);
  } else if (H.length === 7) {
    r = parseInt("0x" + H[1] + H[2]);
    g = parseInt("0x" + H[3] + H[4]);
    b = parseInt("0x" + H[5] + H[6]);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const cmin = Math.min(r, g, b),
    cmax = Math.max(r, g, b),
    delta = cmax - cmin;
  let h = 0,
    s = 0,
    l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return { h, s, l };
};

// Helper: HSL to Hex
export const hslToHex = (h: number, s: number, l: number) => {
  // Normalize hue to 0-360
  h = h % 360;
  if (h < 0) h += 360;

  s = Math.max(0, Math.min(100, s));
  l = Math.max(0, Math.min(100, l));

  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// Helper: Interpolate two Hex Colors
export const interpolateColor = (
  color1: string,
  color2: string,
  factor: number
): string => {
  // Basic Hex parsing
  const parse = (c: string) => {
    const hex = c.replace("#", "");
    if (hex.length === 3)
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    return [
      parseInt(hex.substring(0, 2), 16),
      parseInt(hex.substring(2, 4), 16),
      parseInt(hex.substring(4, 6), 16),
    ];
  };

  const c1 = parse(color1);
  const c2 = parse(color2);

  const r = Math.round(c1[0] + (c2[0] - c1[0]) * factor);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * factor);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * factor);

  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

// Helper: Get Preview Color
export const getDefaultFillEnabled = (type: VisualizerElement["type"]) => {
  if (
    type === "line" ||
    type === "freeform" ||
    type === "spline" ||
    type === "image" ||
    type === "text"
  )
    return false;
  return true;
};

export const getDefaultStrokeEnabled = (type: VisualizerElement["type"]) => {
  if (type === "line" || type === "freeform" || type === "spline") return true;
  if (type === "image" || type === "text") return false;
  return false;
};

export const isFillActive = (el: VisualizerElement) => {
  const enabled = el.fillEnabled ?? getDefaultFillEnabled(el.type);
  if (el.type === "spline") return enabled && !!el.isClosed;
  return enabled;
};

export const isStrokeActive = (el: VisualizerElement) =>
  el.strokeEnabled ?? getDefaultStrokeEnabled(el.type);

export const resolveStrokeColor = (el: VisualizerElement) =>
  el.strokeColor || el.color;

export const resolveStrokeWidth = (el: VisualizerElement) => {
  if (el.type === "line") return el.height;
  return el.strokeWidth ?? 2;
};

// Helper: Generate Cubic Bezier Spline Path
export const getSplinePath = (
  points: VisualizerElement["points"],
  isClosed = false
) => {
  if (!points || points.length === 0) return "";
  const start = points[0];
  let d = `M ${start.x} ${start.y}`;

  type SplinePoint = NonNullable<VisualizerElement["points"]>[number];
  const appendCurve = (from: SplinePoint, to: SplinePoint) => {
    const cp1x = from.x + (from.handleOut?.x || 0);
    const cp1y = from.y + (from.handleOut?.y || 0);
    const cp2x = to.x + (to.handleIn?.x || 0);
    const cp2y = to.y + (to.handleIn?.y || 0);
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`;
  };

  for (let i = 0; i < points.length - 1; i++) {
    appendCurve(points[i], points[i + 1]);
  }

  if (isClosed && points.length > 1) {
    appendCurve(points[points.length - 1], points[0]);
    d += " Z";
  }

  return d;
};

// --- Geometry Helpers for Merging ---

export interface Point {
  x: number;
  y: number;
}

const rotatePoint = (p: Point, angle: number): Point => {
  const rad = (angle * Math.PI) / 180;
  return {
    x: p.x * Math.cos(rad) - p.y * Math.sin(rad),
    y: p.x * Math.sin(rad) + p.y * Math.cos(rad),
  };
};

const getCirclePath = (r: number, offset: Point, angle: number): string => {
  // Cubic bezier approximation of a circle
  const k = 0.5522847498;
  const points = [
    { x: r, y: 0 },
    { x: r, y: k * r },
    { x: k * r, y: r },
    { x: 0, y: r },
    { x: -k * r, y: r },
    { x: -r, y: k * r },
    { x: -r, y: 0 },
    { x: -r, y: -k * r },
    { x: -k * r, y: -r },
    { x: 0, y: -r },
    { x: k * r, y: -r },
    { x: r, y: -k * r },
  ];

  const tPoints = points.map((p) => {
    const rot = rotatePoint(p, angle);
    return { x: rot.x + offset.x, y: rot.y + offset.y };
  });

  return (
    `M ${tPoints[0].x} ${tPoints[0].y} ` +
    `C ${tPoints[1].x} ${tPoints[1].y}, ${tPoints[2].x} ${tPoints[2].y}, ${tPoints[3].x} ${tPoints[3].y} ` +
    `C ${tPoints[4].x} ${tPoints[4].y}, ${tPoints[5].x} ${tPoints[5].y}, ${tPoints[6].x} ${tPoints[6].y} ` +
    `C ${tPoints[7].x} ${tPoints[7].y}, ${tPoints[8].x} ${tPoints[8].y}, ${tPoints[9].x} ${tPoints[9].y} ` +
    `C ${tPoints[10].x} ${tPoints[10].y}, ${tPoints[11].x} ${tPoints[11].y}, ${tPoints[0].x} ${tPoints[0].y} Z`
  );
};

const getRectPath = (
  w: number,
  h: number,
  offset: Point,
  angle: number
): string => {
  const hw = w / 2,
    hh = h / 2;
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
  const tCorners = corners.map((p) => {
    const rot = rotatePoint(p, angle);
    return { x: rot.x + offset.x, y: rot.y + offset.y };
  });
  return `M ${tCorners[0].x} ${tCorners[0].y} L ${tCorners[1].x} ${tCorners[1].y} L ${tCorners[2].x} ${tCorners[2].y} L ${tCorners[3].x} ${tCorners[3].y} Z`;
};

const getTrianglePath = (
  w: number,
  h: number,
  offset: Point,
  angle: number
): string => {
  const hw = w / 2,
    hh = h / 2;
  const points = [
    { x: 0, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
  const tPoints = points.map((p) => {
    const rot = rotatePoint(p, angle);
    return { x: rot.x + offset.x, y: rot.y + offset.y };
  });
  return `M ${tPoints[0].x} ${tPoints[0].y} L ${tPoints[1].x} ${tPoints[1].y} L ${tPoints[2].x} ${tPoints[2].y} Z`;
};

// Generates path for a single element relative to a new origin
const getElementPathData = (
  el: VisualizerElement,
  originX: number,
  originY: number,
  svgW: number,
  svgH: number
): string => {
  const cx = el.x * svgW;
  const cy = el.y * svgH;
  const dx = cx - originX;
  const dy = cy - originY;
  const offset = { x: dx, y: dy };
  const angle = el.rotation;

  if (el.type === "circle") return getCirclePath(el.width / 2, offset, angle);
  if (el.type === "rect" || el.type === "bar")
    return getRectPath(el.width, el.height, offset, angle);
  if (el.type === "triangle")
    return getTrianglePath(el.width, el.height, offset, angle);
  if (el.type === "line")
    return getRectPath(el.width, el.height, offset, angle); // Line approximated as rect

  // Freeform and Spline
  if ((el.type === "freeform" || el.type === "spline") && el.points) {
    // Points are stored relative to el's center (which is 0,0 in local space)
    // We need to rotate them, then translate by offset
    let d = "";
    const transformPoint = (p: Point) => {
      const rot = rotatePoint(p, angle);
      return { x: rot.x + offset.x, y: rot.y + offset.y };
    };

    if (el.type === "freeform") {
      const start = transformPoint(el.points[0]);
      d += `M ${start.x} ${start.y}`;
      for (let i = 1; i < el.points.length; i++) {
        const p = transformPoint(el.points[i]);
        d += ` L ${p.x} ${p.y}`;
      }
    } else {
      // Spline
      const start = transformPoint(el.points[0]);
      d += `M ${start.x} ${start.y}`;
      for (let i = 0; i < el.points.length - 1; i++) {
        const p0 = el.points[i];
        const p1 = el.points[i + 1];

        // Helper to transform handle vectors correctly
        const rotP1 = transformPoint(p1);

        // CP1 = P0 + HandleOut
        const hOut = p0.handleOut || { x: 0, y: 0 };
        const rotHOut = rotatePoint(hOut, angle);
        const cp1 = {
          x: transformPoint(p0).x + rotHOut.x,
          y: transformPoint(p0).y + rotHOut.y,
        };

        // CP2 = P1 + HandleIn
        const hIn = p1.handleIn || { x: 0, y: 0 };
        const rotHIn = rotatePoint(hIn, angle);
        const cp2 = { x: rotP1.x + rotHIn.x, y: rotP1.y + rotHIn.y };

        d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${rotP1.x} ${rotP1.y}`;
      }
      if (el.isClosed && el.points.length > 1) {
        const last = el.points[el.points.length - 1];
        const first = el.points[0];
        const rotLast = transformPoint(last);
        const rotFirst = transformPoint(first);
        const lastHandle = rotatePoint(last.handleOut || { x: 0, y: 0 }, angle);
        const firstHandle = rotatePoint(
          first.handleIn || { x: 0, y: 0 },
          angle
        );
        const cp1 = {
          x: rotLast.x + lastHandle.x,
          y: rotLast.y + lastHandle.y,
        };
        const cp2 = {
          x: rotFirst.x + firstHandle.x,
          y: rotFirst.y + firstHandle.y,
        };
        d += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${rotFirst.x} ${rotFirst.y} Z`;
      }
    }
    return d;
  }

  return "";
};

export const generateMergedElement = (
  elements: VisualizerElement[],
  svgW: number,
  svgH: number
): VisualizerElement | null => {
  if (elements.length < 2) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  elements.forEach((el) => {
    const cx = el.x * svgW;
    const cy = el.y * svgH;
    const hw = el.width / 2;
    const hh = el.height / 2;
    const corners = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];
    corners.forEach((c) => {
      const rot = rotatePoint(c, el.rotation);
      const gx = cx + rot.x;
      const gy = cy + rot.y;
      if (gx < minX) minX = gx;
      if (gx > maxX) maxX = gx;
      if (gy < minY) minY = gy;
      if (gy > maxY) maxY = gy;
    });
  });

  minX -= 2;
  minY -= 2;
  maxX += 2;
  maxY += 2;

  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  let pathData = "";
  elements.forEach((el) => {
    const d = getElementPathData(el, centerX, centerY, svgW, svgH);
    if (d) pathData += `${d} `;
  });

  const topElement = elements[elements.length - 1];

  const mergedEl: VisualizerElement = {
    id: Math.random().toString(36).substring(2, 11),
    type: "custom",
    name: "Merged Shape",
    x: centerX / svgW,
    y: centerY / svgH,
    width: width,
    height: height,
    color: topElement.color,
    fillType: topElement.fillType || "solid",
    gradient: topElement.gradient
      ? { ...topElement.gradient }
      : {
          start: topElement.color,
          end: topElement.color,
          angle: 90,
          type: "linear",
        },
    fillEnabled:
      topElement.fillEnabled ?? getDefaultFillEnabled(topElement.type),
    strokeEnabled:
      topElement.strokeEnabled ?? getDefaultStrokeEnabled(topElement.type),
    strokeColor: topElement.strokeColor || topElement.color,
    strokeWidth:
      topElement.strokeWidth ??
      (topElement.type === "line" ? topElement.height : 2),
    strokeFillType: topElement.strokeFillType || "solid",
    strokeGradient: topElement.strokeGradient
      ? { ...topElement.strokeGradient }
      : undefined,
    rotation: 0,
    opacity: 1,
    animationTracks: [],
    svgContent: `<path d="${pathData}" />`,
    viewBox: `${-width / 2} ${-height / 2} ${width} ${height}`,
  };

  return mergedEl;
};

export const generateSubtractedElement = (
  elements: VisualizerElement[],
  svgW: number,
  svgH: number
): VisualizerElement | null => {
  if (elements.length < 2) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  elements.forEach((el) => {
    const cx = el.x * svgW;
    const cy = el.y * svgH;
    const hw = el.width / 2;
    const hh = el.height / 2;
    const corners = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];
    corners.forEach((c) => {
      const rot = rotatePoint(c, el.rotation);
      const gx = cx + rot.x;
      const gy = cy + rot.y;
      if (gx < minX) minX = gx;
      if (gx > maxX) maxX = gx;
      if (gy < minY) minY = gy;
      if (gy > maxY) maxY = gy;
    });
  });

  minX -= 2;
  minY -= 2;
  maxX += 2;
  maxY += 2;

  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  const baseElement = elements[0];
  const subtractors = elements.slice(1);

  const basePath = getElementPathData(
    baseElement,
    centerX,
    centerY,
    svgW,
    svgH
  );
  let subtractorPaths = "";
  subtractors.forEach((el) => {
    const d = getElementPathData(el, centerX, centerY, svgW, svgH);
    if (d) subtractorPaths += `<path d="${d}" fill="black" />`;
  });

  const maskId = `mask_${Math.random().toString(36).substring(2, 9)}`;

  const svgContent = `
        <defs>
            <mask id="${maskId}">
                <rect x="${-width}" y="${-height}" width="${
    width * 3
  }" height="${height * 3}" fill="black" />
                <path d="${basePath}" fill="white" />
                ${subtractorPaths}
            </mask>
        </defs>
        <g mask="url(#${maskId})">
            <path d="${basePath}" />
        </g>
    `;

  const subtractedEl: VisualizerElement = {
    id: Math.random().toString(36).substring(2, 11),
    type: "custom",
    name: "Subtracted Shape",
    x: centerX / svgW,
    y: centerY / svgH,
    width: width,
    height: height,
    color: baseElement.color,
    fillType: baseElement.fillType || "solid",
    gradient: baseElement.gradient
      ? { ...baseElement.gradient }
      : {
          start: baseElement.color,
          end: baseElement.color,
          angle: 90,
          type: "linear",
        },
    fillEnabled:
      baseElement.fillEnabled ?? getDefaultFillEnabled(baseElement.type),
    strokeEnabled:
      baseElement.strokeEnabled ?? getDefaultStrokeEnabled(baseElement.type),
    strokeColor: baseElement.strokeColor || baseElement.color,
    strokeWidth:
      baseElement.strokeWidth ??
      (baseElement.type === "line" ? baseElement.height : 2),
    strokeFillType: baseElement.strokeFillType || "solid",
    strokeGradient: baseElement.strokeGradient
      ? { ...baseElement.strokeGradient }
      : undefined,
    rotation: 0,
    opacity: 1,
    animationTracks: [],
    svgContent: svgContent,
    viewBox: `${-width / 2} ${-height / 2} ${width} ${height}`,
  };

  return subtractedEl;
};
