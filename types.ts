

export enum VisualizerMode {
  BARS = 'Bars',
  WAVE = 'Wave',
  CIRCLE = 'Radial',
  PARTICLES = 'Particles',
  CUSTOM = 'Custom Workspace'
}

export enum AudioSourceType {
  MICROPHONE = 'Microphone',
  TAB = 'Tab Audio',
  FILE = 'File Upload',
  OSCILLATOR = 'Demo Tone'
}

export enum Quality {
  LOW = 'Low',     // Lower FFT size, fewer particles
  MEDIUM = 'Med',  // Standard
  HIGH = 'High'    // High FFT size, max particles, high DPI
}

export type Theme = 'light' | 'dark' | 'system';
export type AppView = 'landing' | 'visualizer' | 'workspace';

export interface AppState {
  view: AppView;
  isPlaying: boolean;
  mode: VisualizerMode;
  source: AudioSourceType;
  quality: Quality;
  volume: number; // 0 to 1
  isFullscreen: boolean;
}

// Workspace Specific Types
export type ElementType =
  | 'circle'
  | 'rect'
  | 'bar'
  | 'triangle'
  | 'line'
  | 'group'
  | 'custom'
  | 'image'
  | 'freeform'
  | 'spline'
  | 'text';
export type FrequencyRange = 'bass' | 'mid' | 'high';
export type Alignment = 'top' | 'middle' | 'bottom' | 'left' | 'center' | 'right';
export type GridVariant = 'straight' | 'diagonal' | 'dots';

export type AnimationDriver = 'time' | 'audio';
export type AnimationTarget =
  | 'scale'
  | 'opacity'
  | 'x'
  | 'y'
  | 'rotation'
  | 'width'
  | 'height'
  | 'layer'
  | 'color';

export interface AnimationKeyframe {
  id: string;
  offset: number; // 0.0 to 1.0 (Percentage of duration or audio range)
  value: number | string;  // The output value (number for transform, string for layer/color modes)
}

export interface AnimationTrack {
  id: string;
  target: AnimationTarget;
  driver: AnimationDriver;
  duration: number; // ms, used if driver is 'time'
  frequencyRange: [number, number]; // 0.0 - 1.0 (Start % - End %) of spectrum
  keyframes: AnimationKeyframe[];
  enabled: boolean;
}

export interface VisualizerElement {
  id: string;
  type: ElementType;
  name: string;
  x: number; // Percentage 0-1
  y: number; // Percentage 0-1
  width: number;
  height: number;
  color: string;
  fillType: 'solid' | 'gradient';
  gradient: {
    start: string;
    end: string;
    angle: number;
  };
  fillEnabled?: boolean;
  strokeEnabled?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  rotation: number;
  opacity: number;
  animationTracks: AnimationTrack[];
  // Grouping
  children?: VisualizerElement[];
  // Custom SVG properties
  svgContent?: string;
  viewBox?: string;
  // Image properties
  imageSrc?: string;
  mimeType?: string;
  originalFileName?: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  // Freeform / Spline properties
  points?: {
    x: number; 
    y: number;
    // Cubic Bezier Handles (Relative to x,y)
    handleIn?: { x: number, y: number };
    handleOut?: { x: number, y: number };
  }[];
  // Indicates whether a spline connects its last point back to the first
  isClosed?: boolean;
  // Boolean Ops / Masking
  maskId?: string; // ID of the element masking this one (Subtraction)
  // Text properties
  textContent?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
}

export interface WorkspaceProject {
  name: string;
  elements: VisualizerElement[];
  fonts?: WorkspaceFont[];
}

export interface WorkspaceFont {
  id: string;
  name: string;
  fontFamily: string;
  dataUrl: string;
}

export type DragMode = 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'create-tangent' | 'edit-point' | 'edit-handle-in' | 'edit-handle-out' | 'marquee' | null;

export interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  visible: boolean;
}
