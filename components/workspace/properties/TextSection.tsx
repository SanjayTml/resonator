import React, { useRef } from "react";
import { Upload } from "lucide-react";
import { VisualizerElement } from "../../../types";
import {
  Button,
  ColorInput,
  FormField,
  NumberInput,
  SectionCard,
  SelectInput,
  TextArea,
} from "../../ui/primitives";

interface TextSectionProps {
  id: string;
  element: VisualizerElement;
  onUpdate: (id: string, updates: Partial<VisualizerElement>) => void;
  fonts: { id: string; name: string; fontFamily: string; isCustom?: boolean }[];
  onFontUpload: (files: FileList | null) => void;
}

const TextSection: React.FC<TextSectionProps> = ({
  id,
  element,
  onUpdate,
  fonts,
  onFontUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fontValue = element.fontFamily || fonts[0]?.fontFamily || "Inter";

  const handleFontUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFontUpload(files);
  };

  return (
    <SectionCard
      title="Text"
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="text-[11px] font-semibold px-2"
        >
          <Upload size={14} /> Upload Font
        </Button>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        className="hidden"
        onChange={(e) => {
          handleFontUpload(e.target.files);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        multiple
      />

      <FormField label="Content">
        <TextArea
          value={element.textContent ?? "Text"}
          onChange={(e) => onUpdate(id, { textContent: e.target.value })}
          rows={3}
        />
      </FormField>

      <FormField label="Font" action={<span className="text-[10px] text-zinc-400">{fonts.length} available</span>}>
        <SelectInput
          value={fontValue}
          onChange={(e) => onUpdate(id, { fontFamily: e.target.value })}
          size="sm"
        >
          {fonts.map((font) => (
            <option key={font.id} value={font.fontFamily}>
              {font.name}
              {font.isCustom ? " (Custom)" : ""}
            </option>
          ))}
        </SelectInput>
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Size">
          <NumberInput
            size="xs"
            value={(element.fontSize ?? 64).toString()}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onUpdate(id, { fontSize: Number.isFinite(val) ? val : element.fontSize });
            }}
          />
        </FormField>
        <FormField label="Weight">
          <NumberInput
            size="xs"
            value={(element.fontWeight ?? 600).toString()}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onUpdate(id, { fontWeight: Number.isFinite(val) ? val : element.fontWeight });
            }}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Line Height">
        <NumberInput
          size="xs"
          step={0.05}
          value={(element.lineHeight ?? 1.1).toFixed(2)}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onUpdate(id, { lineHeight: Number.isFinite(val) ? val : element.lineHeight });
          }}
        />
        </FormField>
        <FormField label="Letter Spacing">
        <NumberInput
          size="xs"
          step={0.5}
          value={(element.letterSpacing ?? 0).toString()}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onUpdate(id, { letterSpacing: Number.isFinite(val) ? val : element.letterSpacing });
          }}
        />
        </FormField>
      </div>

      <FormField label="Alignment">
        <SelectInput
          size="sm"
          value={element.textAlign ?? "center"}
          onChange={(e) => onUpdate(id, { textAlign: e.target.value as "left" | "center" | "right" })}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </SelectInput>
      </FormField>

      <FormField label="Color">
        <ColorInput
          value={element.color}
          onChange={(value) => onUpdate(id, { color: value })}
          swatchSize="sm"
        />
      </FormField>
    </SectionCard>
  );
};

export default TextSection;
