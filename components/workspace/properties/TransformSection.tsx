import React from 'react';
import { VisualizerElement } from '../../../types';
import { FormField, NumberInput, SectionCard, ValueSlider } from '../../ui/primitives';

interface TransformSectionProps {
  id: string;
  element: VisualizerElement;
  onUpdate: (id: string, updates: Partial<VisualizerElement>) => void;
}

const TransformSection: React.FC<TransformSectionProps> = ({ id, element, onUpdate }) => {
  return (
    <SectionCard title="Transform" muted>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Pos X %">
          <NumberInput
            size="xs"
            step={0.01}
            value={(element.x * 100).toFixed(1)}
            onChange={(e) => onUpdate(id, { x: parseFloat(e.target.value) / 100 })}
          />
        </FormField>
        <FormField label="Pos Y %">
          <NumberInput
            size="xs"
            step={0.01}
            value={(element.y * 100).toFixed(1)}
            onChange={(e) => onUpdate(id, { y: parseFloat(e.target.value) / 100 })}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Width">
          <NumberInput
            size="xs"
            value={Math.round(element.width)}
            onChange={(e) => onUpdate(id, { width: parseFloat(e.target.value) })}
          />
        </FormField>
        <FormField label="Height">
          <NumberInput
            size="xs"
            value={Math.round(element.height)}
            onChange={(e) => onUpdate(id, { height: parseFloat(e.target.value) })}
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Rotation">
          <ValueSlider
            value={element.rotation}
            onChange={(value) => onUpdate(id, { rotation: value })}
            min={0}
            max={360}
            step={1}
            numberInputProps={{ step: 1 }}
          />
        </FormField>
        <FormField label="Opacity">
          <ValueSlider
            value={element.opacity ?? 1}
            onChange={(value) => onUpdate(id, { opacity: Math.max(0, Math.min(1, value)) })}
            min={0}
            max={1}
            step={0.01}
            format={(val) => val.toFixed(1)}
            parse={(val) => parseFloat(val)}
            numberInputProps={{ step: 0.1, min: 0, max: 1 }}
          />
        </FormField>
      </div>
    </SectionCard>
  );
};

export default TransformSection;
