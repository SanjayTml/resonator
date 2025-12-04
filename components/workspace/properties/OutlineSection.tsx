import React, { useState } from 'react';
import { VisualizerElement } from '../../../types';
import { getDefaultStrokeEnabled } from '../utils';
import { ColorInput, SectionCard, Toggle, ValueSlider } from '../../ui/primitives';

interface OutlineSectionProps {
  id: string;
  element: VisualizerElement;
  onUpdate: (id: string, updates: Partial<VisualizerElement>) => void;
}

const OutlineSection: React.FC<OutlineSectionProps> = ({ id, element, onUpdate }) => {
  const [open, setOpen] = useState(true);
  const strokeEnabled = element.strokeEnabled ?? getDefaultStrokeEnabled(element.type);
  const strokeColor = element.strokeColor || element.color;
  const strokeWidthValue = element.type === 'line' ? element.height : element.strokeWidth ?? 2;

  const handleStrokeWidthChange = (value: number) => {
    if (Number.isNaN(value)) return;
    const clamped = Math.max(0, value);
    if (element.type === 'line') {
      onUpdate(id, { height: clamped, strokeWidth: clamped });
    } else {
      onUpdate(id, { strokeWidth: clamped });
    }
  };

  return (
    <SectionCard
      title="Outline"
      collapsible
      open={open}
      onToggle={setOpen}
      actions={
        <Toggle
          checked={strokeEnabled}
          onCheckedChange={(checked) => onUpdate(id, { strokeEnabled: checked })}
          aria-label="Toggle outline"
        />
      }
    >
      <div className={`${strokeEnabled ? '' : 'opacity-40 pointer-events-none'} space-y-3`}>
        <div className="flex items-center gap-3">
          <span className="w-16 text-[10px] font-bold uppercase text-zinc-400">Color</span>
          <ColorInput
            value={strokeColor}
            onChange={(value) => onUpdate(id, { strokeColor: value })}
            swatchSize="sm"
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-16 text-[10px] font-bold uppercase text-zinc-400">Width</span>
          <div className="flex-1">
            <ValueSlider
              value={strokeWidthValue}
              onChange={handleStrokeWidthChange}
              min={0}
              max={40}
              step={0.5}
              format={(val) => val.toFixed(1)}
              parse={(val) => parseFloat(val)}
              numberInputProps={{ step: 0.5, min: 0 }}
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default OutlineSection;
