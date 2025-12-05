import React from "react";
import { Group } from "lucide-react";
import { VisualizerElement } from "../../types";
import { findElementById } from "./elementTree";
import { Button, SectionDivider, InfoDialog } from "../ui/primitives";
import NameSection from "./properties/NameSection";
import TransformSection from "./properties/TransformSection";
import FillSection from "./properties/FillSection";
import OutlineSection from "./properties/OutlineSection";
import AnimationsSection from "./properties/AnimationsSection";
import TextSection from "./properties/TextSection";

interface WorkspacePropertiesProps {
  selectedIds: Set<string>;
  elements: VisualizerElement[];
  onUpdate: (id: string, updates: Partial<VisualizerElement>) => void;
  onGroup: () => void;
  innerSelectionId?: string | null;
  fonts: { id: string; name: string; fontFamily: string; isCustom?: boolean }[];
  onFontUpload: (files: FileList | null, elementId?: string) => void;
}

const WorkspaceProperties: React.FC<WorkspacePropertiesProps> = ({
  selectedIds,
  elements,
  onUpdate,
  onGroup,
  innerSelectionId,
  fonts,
  onFontUpload,
}) => {
  const effectiveSelection = innerSelectionId
    ? new Set([innerSelectionId])
    : selectedIds;

  if (effectiveSelection.size === 0) {
    return (
      <div className="w-80 border-l border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-y-auto shrink-0 z-20 custom-scrollbar">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Properties
          </span>
          <InfoDialog
            title="Properties Panel"
            description="Select a layer to unlock detailed controls."
            triggerClassName="text-zinc-500"
          >
            <p>Pick any layer on the canvas or in the Layers panel to edit it here.</p>
            <p className="text-sm">No selection = no editable properties.</p>
          </InfoDialog>
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
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Properties
          </span>
          <InfoDialog
            title="Properties Panel"
            description="Batch selection detected."
            triggerClassName="text-zinc-500"
          >
            <p>
              Multiple items are highlighted. You can group them, but per-element controls are hidden until you
              select a single layer.
            </p>
          </InfoDialog>
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
  const supportsFill =
    el.type !== "line" && el.type !== "image" && el.type !== "text";
  const supportsOutline = el.type !== "image" && el.type !== "text";
  const isTextElement = el.type === "text";

  return (
    <div className="w-80 border-l border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-y-auto shrink-0 z-20 custom-scrollbar">
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Properties
        </span>
        <InfoDialog
          title="Properties Panel"
          description="Tweak the selected element with precision controls."
          triggerClassName="text-zinc-500"
        >
          <p>
            This panel adapts to whatever you have selected so you can rename layers, adjust transforms,
            change fills/outline, or edit text settings without leaving the canvas.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Edit position, size, rotation, opacity, and layout from Transform.</li>
            <li>Fill/Outline controls appear for shapes while text shows typography controls.</li>
            <li>Use the Animations section to add tracks that react to time or audio.</li>
          </ul>
        </InfoDialog>
      </div>

      <div className="p-6 pb-24 space-y-6">
        <NameSection id={id} element={el} onUpdate={onUpdate} />

        <TransformSection id={id} element={el} onUpdate={onUpdate} />

        {isTextElement ? (
          <TextSection
            id={id}
            element={el}
            onUpdate={onUpdate}
            fonts={fonts}
            onFontUpload={onFontUpload}
          />
        ) : (
          el.type !== "group" && (
            <div className="space-y-4">
              {supportsFill && (
                <FillSection id={id} element={el} onUpdate={onUpdate} />
              )}

              {supportsOutline && (
                <OutlineSection id={id} element={el} onUpdate={onUpdate} />
              )}
            </div>
          )
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
