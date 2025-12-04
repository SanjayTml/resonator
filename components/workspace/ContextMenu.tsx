
import React from 'react';
import { 
  Copy, Trash2, 
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  ChevronUp, ChevronDown, ChevronsUp, ChevronsDown
} from 'lucide-react';
import { VisualizerElement, Alignment } from '../../types';

type LayerAction = 'bring-forward' | 'send-backward' | 'bring-to-front' | 'send-to-back';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onAlign: (alignment: Alignment) => void;
  onLayerAction: (action: LayerAction) => void;
  selectedElement?: VisualizerElement;
  selectedCount: number;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ 
  x, y, onClose, onCopy, onDelete, onAlign, onLayerAction, selectedElement, selectedCount 
}) => {
  return (
    <>
        <div className="fixed inset-0 z-40" onClick={onClose}></div>
        <div className="fixed bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-xl rounded-xl py-1 z-50 min-w-[160px] flex flex-col" style={{ top: y, left: x }}>
            
            {/* Alignment Options - Only show if multiple items selected */}
            {selectedCount > 1 && (
              <>
                <div className="px-4 py-1 text-[10px] text-zinc-400 font-bold uppercase mt-1">Align</div>
                <div className="grid grid-cols-6 gap-0.5 px-2 pb-2">
                    <button onClick={() => { onAlign('left'); onClose(); }} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300" title="Align Left"><AlignStartVertical size={14}/></button>
                    <button onClick={() => { onAlign('center'); onClose(); }} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300" title="Align Center"><AlignCenterVertical size={14}/></button>
                    <button onClick={() => { onAlign('right'); onClose(); }} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300" title="Align Right"><AlignEndVertical size={14}/></button>
                    <button onClick={() => { onAlign('top'); onClose(); }} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300" title="Align Top"><AlignStartHorizontal size={14}/></button>
                    <button onClick={() => { onAlign('middle'); onClose(); }} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300" title="Align Middle"><AlignCenterHorizontal size={14}/></button>
                    <button onClick={() => { onAlign('bottom'); onClose(); }} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300" title="Align Bottom"><AlignEndHorizontal size={14}/></button>
                </div>
                <div className="h-px bg-zinc-100 dark:bg-zinc-700 my-1"></div>
              </>
            )}

            {selectedCount > 0 && (
              <>
                <div className="px-4 py-1 text-[10px] text-zinc-400 font-bold uppercase">Layer</div>
                <button onClick={() => { onLayerAction('bring-forward'); onClose(); }} className="px-4 py-2 text-xs text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2">
                  <ChevronUp size={12}/> Bring Forward
                </button>
                <button onClick={() => { onLayerAction('send-backward'); onClose(); }} className="px-4 py-2 text-xs text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2">
                  <ChevronDown size={12}/> Send Backward
                </button>
                <button onClick={() => { onLayerAction('bring-to-front'); onClose(); }} className="px-4 py-2 text-xs text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2">
                  <ChevronsUp size={12}/> Bring to Front
                </button>
                <button onClick={() => { onLayerAction('send-to-back'); onClose(); }} className="px-4 py-2 text-xs text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2">
                  <ChevronsDown size={12}/> Send to Back
                </button>
                <div className="h-px bg-zinc-100 dark:bg-zinc-700 my-1"></div>
              </>
            )}

            <button onClick={() => { onCopy(); onClose(); }} className="px-4 py-2 text-xs text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"><Copy size={12}/> Copy</button>
            <div className="h-px bg-zinc-100 dark:bg-zinc-700 my-1"></div>
            {selectedElement?.type === 'spline' && (
                    <div className="border-b border-zinc-100 dark:border-zinc-700 mb-1 pb-1">
                        <div className="px-4 py-1 text-[10px] text-zinc-400 font-bold uppercase">Spline Tools</div>
                        <div className="px-4 py-1 text-xs text-zinc-500 italic">Ctrl+Click point to delete</div>
                        <div className="px-4 py-1 text-xs text-zinc-500 italic">Drag handles for curve</div>
                    </div>
            )}
            <button onClick={() => { onDelete(); onClose(); }} className="px-4 py-2 text-xs text-left hover:bg-red-50 text-red-600 flex items-center gap-2"><Trash2 size={12}/> Delete</button>
        </div>
    </>
  );
};

export default ContextMenu;
