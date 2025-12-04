import React from "react";
import { Group } from "lucide-react";
import { VisualizerElement } from "../../types";
import { findElementById } from "./elementTree";
import { Button, SectionDivider } from "../ui/primitives";
import NameSection from "./properties/NameSection";
import TransformSection from "./properties/TransformSection";
import FillSection from "./properties/FillSection";
import OutlineSection from "./properties/OutlineSection";
import AnimationsSection from "./properties/AnimationsSection";

interface WorkspacePropertiesProps {
  selectedIds: Set<string>;
  elements: VisualizerElement[];
  onUpdate: (id: string, updates: Partial<VisualizerElement>) => void;
  onGroup: () => void;
  innerSelectionId?: string | null;
}

const WorkspaceProperties: React.FC<WorkspacePropertiesProps> = ({
  selectedIds,
  elements,
  onUpdate,
  onGroup,
  innerSelectionId,
}) => {
  const effectiveSelection = innerSelectionId
    ? new Set([innerSelectionId])
    : selectedIds;

  if (effectiveSelection.size === 0) {
    return (
      <div className="w-80 border-l border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-y-auto shrink-0 z-20 custom-scrollbar">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Properties
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 gap-3 p-8 text-center">
          <p className="text-sm">Select an element to edit properties</p>
        </div>
      </div>
    );
  }

  if (effectiveSelection.size > 1) {
    return (
      <div className="w-80 border-l border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-y-auto shrink-0 z-20 custom-scrollbar">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Properties
          </span>
        </div>
        <div className="p-8 text-center text-zinc-500">
          <Group size={32} className="mx-auto mb-4 text-zinc-300" />
          <p>{effectiveSelection.size} items selected</p>
          <Button size="sm" className="mt-4" onClick={onGroup}>
            Group Items
          </Button>
        </div>
      </div>
    );
  }

  const id = Array.from(effectiveSelection)[0] as string;
  const el = findElementById(id, elements);
  if (!el) return null;
  const supportsFill = el.type !== "line";

  return (
    <div className="w-80 border-l border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-y-auto shrink-0 z-20 custom-scrollbar">
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Properties
        </span>
      </div>

      <div className="p-6 pb-24 space-y-6">
        <NameSection id={id} element={el} onUpdate={onUpdate} />

        <TransformSection id={id} element={el} onUpdate={onUpdate} />

        {el.type !== "group" && (
          <div className="space-y-4">
            {supportsFill && (
              <FillSection id={id} element={el} onUpdate={onUpdate} />
            )}

            <OutlineSection id={id} element={el} onUpdate={onUpdate} />
          </div>
        )}

        <SectionDivider />

        <AnimationsSection
          id={id}
          element={el}
          elements={elements}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
};

export default WorkspaceProperties;
