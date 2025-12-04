import React from 'react';
import { VisualizerElement } from '../../../types';
import { FormField, TextInput } from '../../ui/primitives';

interface NameSectionProps {
  id: string;
  element: VisualizerElement;
  onUpdate: (id: string, updates: Partial<VisualizerElement>) => void;
}

const NameSection: React.FC<NameSectionProps> = ({ id, element, onUpdate }) => {
  return (
    <FormField label="Name">
      <TextInput
        size="sm"
        value={element.name}
        onChange={(e) => onUpdate(id, { name: e.target.value })}
      />
    </FormField>
  );
};

export default NameSection;
