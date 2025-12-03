import React, { useRef } from 'react';
import { 
  X, Undo2, Redo2, Group, Ungroup, Combine, Scissors, 
  MousePointer2, Pencil, PenTool, Plus, ChevronDown, 
  Circle, Square, Triangle, Minus, Image as ImageIcon,
  FolderOpen, Download, PlusCircle, Delete
} from 'lucide-react';
import { ElementType, VisualizerElement } from '../../types';

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
  toolMode: 'pointer' | 'shape' | 'freeform' | 'spline';
  setToolMode: (mode: 'pointer' | 'shape' | 'freeform' | 'spline') => void;
  onGroup: () => void;
  onUngroup: () => void;
  onUnion: () => void;
  onSubtract: () => void;
  addElement: (type: ElementType) => void;
  onSVGUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedSplineId?: string;
  resumeSplineEditing: () => void;
  removeLastSplinePoint: () => void;
}

const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  onClose, undo, redo, historyLength, redoStackLength,
  projectName, setProjectName, onSave, onImport,
  toolMode, setToolMode,
  onGroup, onUngroup, onUnion, onSubtract,
  addElement, onSVGUpload,
  selectedSplineId, resumeSplineEditing, removeLastSplinePoint
}) => {
  const fileProjectImportRef = useRef<HTMLInputElement>(null);
  const svgUploadRef = useRef<HTMLInputElement>(null);

  return (
    <div className="h-16 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-6 shrink-0 bg-white dark:bg-zinc-900 z-30">
        <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500"><X size={20} /></button>
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>
            
            <div className="flex items-center gap-1">
            <button onClick={undo} disabled={historyLength === 0} className="p-2 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"><Undo2 size={16}/></button>
            <button onClick={redo} disabled={redoStackLength === 0} className="p-2 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"><Redo2 size={16}/></button>
            </div>
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>

            <div className="flex items-center gap-1">
            <button onClick={onGroup} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300" title="Group"><Group size={16} /></button>
            <button onClick={onUngroup} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300" title="Ungroup"><Ungroup size={16} /></button>
            <button onClick={onUnion} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300" title="Merge"><Combine size={16} /></button>
            <button onClick={onSubtract} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300" title="Subtract"><Scissors size={16} /></button>
            </div>

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800"></div>
            
            {/* Spline Context Tools */}
            {selectedSplineId && (
            <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-1 border border-blue-100 dark:border-blue-800/50 mx-2">
                <span className="text-[10px] font-bold text-blue-500 uppercase px-2">Spline</span>
                <button onClick={resumeSplineEditing} className="p-2 hover:bg-white dark:hover:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300" title="Append Points"><PlusCircle size={16} /></button>
                <button onClick={removeLastSplinePoint} className="p-2 hover:bg-white dark:hover:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300" title="Remove Last Point"><Delete size={16} /></button>
            </div>
            )}
            
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/50 rounded-xl p-1 border border-zinc-200 dark:border-zinc-700/50 ml-2">
            <button onClick={() => setToolMode('pointer')} className={`p-2 rounded-lg transition-all ${toolMode === 'pointer' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} title="Pointer"><MousePointer2 size={16} /></button>
            {/* REMOVED MARQUEE BUTTON - Combined into Pointer */}
            <button onClick={() => setToolMode('freeform')} className={`p-2 rounded-lg transition-all ${toolMode === 'freeform' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} title="Freeform Line"><Pencil size={16} /></button>
            <button onClick={() => setToolMode('spline')} className={`p-2 rounded-lg transition-all ${toolMode === 'spline' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} title="Spline Curve"><PenTool size={16} /></button>
            <div className="relative group">
                <button className={`p-2 rounded-lg flex items-center gap-1 transition-all ${toolMode === 'shape' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}><Plus size={16} /><ChevronDown size={12} /></button>
                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-1 hidden group-hover:block w-40 z-50">
                    <button onClick={() => addElement('circle')} className="flex items-center gap-3 w-full text-left p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"><Circle size={14} /> Circle</button>
                    <button onClick={() => addElement('rect')} className="flex items-center gap-3 w-full text-left p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"><Square size={14} /> Square</button>
                    <button onClick={() => addElement('triangle')} className="flex items-center gap-3 w-full text-left p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"><Triangle size={14} /> Triangle</button>
                    <button onClick={() => addElement('line')} className="flex items-center gap-3 w-full text-left p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"><Minus size={14} /> Line</button>
                    <div className="h-px bg-zinc-100 dark:bg-zinc-700 my-1"></div>
                    <button onClick={() => svgUploadRef.current?.click()} className="flex items-center gap-3 w-full text-left p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-300"><ImageIcon size={14} /> Upload SVG</button>
                    <input ref={svgUploadRef} type="file" accept=".svg" className="hidden" onChange={onSVGUpload} />
                </div>
            </div>
            </div>
        </div>

        <div className="flex items-center gap-6">
            <input className="bg-transparent text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-center hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg px-2 py-1 outline-none" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
            <div className="flex items-center gap-2">
                <button onClick={() => fileProjectImportRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"><FolderOpen size={14}/> Open</button>
                <button onClick={onSave} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200"><Download size={14}/> Save</button>
                <input ref={fileProjectImportRef} type="file" accept=".json" className="hidden" onChange={onImport} />
            </div>
        </div>
    </div>
  );
};

export default WorkspaceHeader;