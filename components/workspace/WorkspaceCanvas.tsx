import React, { RefObject } from 'react';
import { VisualizerElement, DragMode, SelectionBox } from '../../types';
import { getSplinePath, isFillActive, isStrokeActive, resolveStrokeColor, resolveStrokeWidth } from './utils';

interface WorkspaceCanvasProps {
  svgRef: RefObject<SVGSVGElement | null>;
  elementRefs: React.MutableRefObject<Map<string, SVGElement>>;
  elements: VisualizerElement[];
  selectedIds: Set<string>;
  onMouseDown: (e: React.MouseEvent, mode: DragMode, id?: string) => void;
  onContextMenu: (e: React.MouseEvent, id?: string) => void;
  // Spline handlers
  onSplinePointMouseDown: (e: React.MouseEvent, elId: string, idx: number, type: 'anchor' | 'in' | 'out') => void;
  selectionBox?: SelectionBox;
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  isPanning: boolean;
  isSpacePressed: boolean;
}

const WorkspaceCanvas: React.FC<WorkspaceCanvasProps> = ({ 
  svgRef, elementRefs, elements, selectedIds, 
  onMouseDown, onContextMenu, onSplinePointMouseDown, selectionBox,
  canvasScale, canvasOffset, isPanning, isSpacePressed
}) => {
  const transformStyle: React.CSSProperties = {
    transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`,
    transformOrigin: '0 0'
  };
  const panCursor = isPanning ? 'grabbing' : isSpacePressed ? 'grab' : undefined;

  const renderSplineControls = (el: VisualizerElement) => {
     if (el.type !== 'spline' || !el.points || !selectedIds.has(el.id)) return null;
     return (
         <g>
             {el.points.map((p, i) => {
                 const handleInX = p.x + (p.handleIn?.x || 0);
                 const handleInY = p.y + (p.handleIn?.y || 0);
                 const handleOutX = p.x + (p.handleOut?.x || 0);
                 const handleOutY = p.y + (p.handleOut?.y || 0);
                 return (
                     <g key={i}>
                         <line x1={p.x} y1={p.y} x2={handleInX} y2={handleInY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="2 2" pointerEvents="none" />
                         <line x1={p.x} y1={p.y} x2={handleOutX} y2={handleOutY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="2 2" pointerEvents="none" />
                         <circle cx={handleInX} cy={handleInY} r="3" fill="#ef4444" stroke="white" strokeWidth="1" className="cursor-pointer" style={{ transformOrigin: 'center', transformBox: 'fill-box' }} onMouseDown={(e) => onSplinePointMouseDown(e, el.id, i, 'in')} />
                         <circle cx={handleOutX} cy={handleOutY} r="3" fill="#ef4444" stroke="white" strokeWidth="1" className="cursor-pointer" style={{ transformOrigin: 'center', transformBox: 'fill-box' }} onMouseDown={(e) => onSplinePointMouseDown(e, el.id, i, 'out')} />
                         <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="1.5" className="cursor-pointer" style={{ transformOrigin: 'center', transformBox: 'fill-box' }} onMouseDown={(e) => onSplinePointMouseDown(e, el.id, i, 'anchor')} />
                     </g>
                 );
             })}
         </g>
     );
  };

  const renderShape = (el: VisualizerElement) => {
      const xStr = `${el.x * 100}%`;
      const yStr = `${el.y * 100}%`;
      const commonProps = { style: { transformOrigin: 'center', transformBox: 'fill-box' } as React.CSSProperties };
      
      const fillActive = isFillActive(el);
      let fillProp: any = { fill: 'none' };
      let defs = null;
      if (fillActive) {
          if (el.fillType === 'gradient' && el.gradient) {
              const gradId = `grad_${el.id}`;
              fillProp = { fill: `url(#${gradId})` };
              defs = (
                  <defs>
                      <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform={`rotate(${el.gradient.angle || 0})`}>
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
          : { stroke: 'none' };

      let shape;
      if (el.type === 'group') {
         shape = <g>{el.children?.map(renderShape)}</g>;
      } 
      else if (el.type === 'circle') shape = <circle cx="0" cy="0" r={el.width / 2} {...fillProp} {...strokeProp} {...commonProps} />;
      else if (el.type === 'rect' || el.type === 'bar') shape = <rect x={-el.width/2} y={-el.height/2} width={el.width} height={el.height} {...fillProp} {...strokeProp} {...commonProps} />;
      else if (el.type === 'line') shape = <line x1={-el.width/2} y1="0" x2={el.width/2} y2="0" {...strokeProp} {...commonProps} />;
      else if (el.type === 'triangle') shape = <polygon points={`0,${-el.height/2} ${el.width/2},${el.height/2} ${-el.width/2},${el.height/2}`} {...fillProp} {...strokeProp} {...commonProps} />;
      else if (el.type === 'freeform' && el.points) {
          const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          shape = <path d={d} {...fillProp} {...strokeProp} {...commonProps} strokeLinecap="round" strokeLinejoin="round" />;
      }
      else if (el.type === 'spline' && el.points) {
          const d = getSplinePath(el.points, !!el.isClosed);
          shape = (
             <g>
                 <path d={d} {...fillProp} {...strokeProp} {...commonProps} strokeLinecap="round" strokeLinejoin="round" />
                 {renderSplineControls(el)}
             </g>
          );
      }
      else if (el.type === 'custom' && el.svgContent) {
          shape = (
              <svg viewBox={el.viewBox} x={-el.width/2} y={-el.height/2} width={el.width} height={el.height} overflow="visible" {...commonProps}>
                 <g dangerouslySetInnerHTML={{ __html: el.svgContent || '' }} fill="currentColor" stroke="currentColor" style={{ color: el.color }} />
              </svg>
          );
      }

      const isSelected = selectedIds.has(el.id);
      return (
          <g key={el.id} style={{ translate: `${xStr} ${yStr}`, rotate: `${el.rotation}deg` }}>
             {defs}
             <g ref={node => { if(node) elementRefs.current.set(el.id, node as SVGElement); }} style={{ opacity: el.opacity }}>
                 <g 
                    onMouseDown={(e) => onMouseDown(e, 'move', el.id)} 
                    onContextMenu={(e) => onContextMenu(e, el.id)} 
                    className={`cursor-pointer transition-opacity ${isSelected ? 'opacity-100' : 'hover:opacity-80'}`}
                 >
                    {shape}
                    
                    {/* Selection Border & Handles */}
                    {isSelected && el.type !== 'spline' && (
                        <g>
                             <rect x={-el.width/2 - 2} y={-el.height/2 - 2} width={el.width + 4} height={el.height + 4} fill="none" stroke="#3b82f6" strokeWidth="1" pointerEvents="none" strokeDasharray="4 2" />
                             
                             <rect x={-el.width/2 - 6} y={-el.height/2 - 6} width={8} height={8} fill="white" stroke="#3b82f6" strokeWidth="1" className="cursor-nw-resize" onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'resize-tl', el.id); }} />
                             <rect x={el.width/2 - 2} y={-el.height/2 - 6} width={8} height={8} fill="white" stroke="#3b82f6" strokeWidth="1" className="cursor-ne-resize" onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'resize-tr', el.id); }} />
                             <rect x={-el.width/2 - 6} y={el.height/2 - 2} width={8} height={8} fill="white" stroke="#3b82f6" strokeWidth="1" className="cursor-sw-resize" onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'resize-bl', el.id); }} />
                             <rect x={el.width/2 - 2} y={el.height/2 - 2} width={8} height={8} fill="white" stroke="#3b82f6" strokeWidth="1" className="cursor-se-resize" onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, 'resize-br', el.id); }} />
                        </g>
                    )}
                 </g>
             </g>
          </g>
      );
  };

  return (
    <div className="w-full h-full bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col overflow-hidden">
        <div className="relative w-full h-full bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden" onMouseDown={(e) => onMouseDown(e, null)} onContextMenu={(e) => onContextMenu(e)} style={{ cursor: panCursor }}>
            <div className="relative w-full h-full" style={transformStyle}>
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: `linear-gradient(45deg, currentColor 25%, transparent 25%), linear-gradient(-45deg, currentColor 25%, transparent 25%), linear-gradient(45deg, transparent 75%, currentColor 75%), linear-gradient(-45deg, transparent 75%, currentColor 75%)`, backgroundSize: '20px 20px' }}></div>
                <svg ref={svgRef} className="w-full h-full block select-none">
                    {elements.map(renderShape)}
                    
                    {selectionBox && selectionBox.visible && (
                        <rect 
                            x={Math.min(selectionBox.startX, selectionBox.currentX)} 
                            y={Math.min(selectionBox.startY, selectionBox.currentY)} 
                            width={Math.abs(selectionBox.currentX - selectionBox.startX)} 
                            height={Math.abs(selectionBox.currentY - selectionBox.startY)} 
                            fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2" pointerEvents="none"
                        />
                    )}
                </svg>
            </div>
        </div>
    </div>
  );
};

export default WorkspaceCanvas;
