import React, { useState } from 'react';
import { VisualizerElement } from '../../../types';
import { getDefaultFillEnabled } from '../utils';
import { ColorInput, SectionCard, SelectInput, Toggle, ValueSlider } from '../../ui/primitives';

interface FillSectionProps {
  id: string;
  element: VisualizerElement;
  onUpdate: (id: string, updates: Partial<VisualizerElement>) => void;
}

const FillSection: React.FC<FillSectionProps> = ({ id, element, onUpdate }) => {
  const [open, setOpen] = useState(true);
  const fillEnabled = element.fillEnabled ?? getDefaultFillEnabled(element.type);
  const gradientSettings =
    element.gradient || ({
      start: element.color,
      end: element.color,
      angle: 90,
      type: 'linear',
    } as VisualizerElement['gradient']);
  const gradientMode = gradientSettings.type ?? 'linear';

  return (
    <SectionCard
      title="Fill"
      collapsible
      open={open}
      onToggle={setOpen}
      actions={
        <div className="flex items-center gap-2">
          <SelectInput
            size="xs"
            block={false}
            className="text-[11px] font-semibold"
            value={element.fillType || 'solid'}
            onChange={(e) => onUpdate(id, { fillType: e.target.value as 'solid' | 'gradient' })}
          >
            <option value="solid">Solid</option>
            <option value="gradient">Gradient</option>
          </SelectInput>
          <Toggle
            checked={fillEnabled}
            onCheckedChange={(checked) => onUpdate(id, { fillEnabled: checked })}
            aria-label="Toggle fill"
          />
        </div>
      }
    >
      <div className={`space-y-3 ${fillEnabled ? '' : 'opacity-40 pointer-events-none'}`}>
        {element.fillType === 'gradient' ? (
          <>
            <div className="flex items-center gap-3">
              <span className="w-16 text-[10px] font-bold uppercase text-zinc-400">Style</span>
              <SelectInput
                size="xs"
                value={gradientMode}
                onChange={(e) =>
                  onUpdate(id, {
                    gradient: {
                      ...gradientSettings,
                      type: e.target.value as 'linear' | 'radial',
                    },
                  })
                }
              >
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </SelectInput>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-16 text-[10px] font-bold uppercase text-zinc-400">Start</span>
              <ColorInput
                value={element.gradient?.start || element.color}
                onChange={(value) =>
                  onUpdate(id, {
                    gradient: {
                      ...(element.gradient || {
                        end: element.color,
                        angle: 90,
                        type: 'linear',
                      }),
                      start: value,
                    },
                  })
                }
                swatchSize="sm"
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-16 text-[10px] font-bold uppercase text-zinc-400">End</span>
              <ColorInput
                value={element.gradient?.end || element.color}
                onChange={(value) =>
                  onUpdate(id, {
                    gradient: {
                      ...(element.gradient || {
                        start: element.color,
                        angle: 90,
                        type: 'linear',
                      }),
                      end: value,
                    },
                  })
                }
                swatchSize="sm"
                className="flex-1"
              />
            </div>
            {gradientMode === 'linear' && (
              <div className="flex items-center gap-3">
                <span className="w-16 text-[10px] font-bold uppercase text-zinc-400">Angle</span>
                <div className="flex-1">
                  <ValueSlider
                    value={gradientSettings.angle ?? 90}
                    onChange={(value) =>
                      onUpdate(id, {
                        gradient: {
                          ...(element.gradient || {
                            start: element.color,
                            end: element.color,
                            type: gradientMode,
                          }),
                          angle: value,
                        },
                      })
                    }
                    min={0}
                    max={360}
                    step={1}
                    suffix="°"
                    numberInputProps={{ step: 1 }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span className="w-16 text-[10px] font-bold uppercase text-zinc-400">Color</span>
            <ColorInput
              value={element.color}
              onChange={(value) => onUpdate(id, { color: value })}
              swatchSize="sm"
              className="flex-1"
            />
          </div>
        )}
      </div>
    </SectionCard>
  );
};

export default FillSection;
