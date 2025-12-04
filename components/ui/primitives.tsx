import React from "react";
import { cn } from "./cn";

const inputSizes = {
  xs: "px-2 py-1 text-[10px]",
  sm: "px-3 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
};

const buttonSizes = {
  xs: "h-6 px-2 text-[10px]",
  sm: "h-8 px-3 text-[12px]",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-6 text-base",
};

const buttonVariants = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
  secondary:
    "bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-700",
  subtle:
    "bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80 dark:bg-zinc-800/60 dark:text-zinc-200 dark:hover:bg-zinc-700/60",
  ghost:
    "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60",
  danger: "bg-red-600 text-white hover:bg-red-500",
};

const sliderHeights = {
  thin: "h-1",
  default: "h-1.5",
};

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  size?: keyof typeof inputSizes;
  block?: boolean;
  muted?: boolean;
}

const baseInputStyles =
  "rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 focus:border-zinc-400 dark:focus:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ size = "sm", className, block = true, muted, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        baseInputStyles,
        inputSizes[size],
        block ? "w-full" : "w-auto",
        muted && "bg-zinc-50 dark:bg-zinc-800",
        className
      )}
      {...props}
    />
  )
);
TextInput.displayName = "TextInput";

export interface NumberInputProps extends TextInputProps {}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, ...props }, ref) => (
    <TextInput
      ref={ref}
      type="number"
      className={cn("tabular-nums", className)}
      {...props}
    />
  )
);
NumberInput.displayName = "NumberInput";

export interface SelectInputProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  size?: keyof typeof inputSizes;
  block?: boolean;
}

export const SelectInput = React.forwardRef<
  HTMLSelectElement,
  SelectInputProps
>(({ size = "sm", className, block = true, ...props }, ref) => (
  <div
    className={cn(
      "relative inline-flex items-center",
      block ? "w-full" : "w-auto"
    )}
  >
    <select
      ref={ref}
      className={cn(
        baseInputStyles,
        inputSizes[size],
        block ? "w-full" : "w-auto",
        "appearance-none pr-8",
        className
      )}
      {...props}
    />
    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400">
      ▾
    </span>
  </div>
));
SelectInput.displayName = "SelectInput";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  iconOnly?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      className,
      iconOnly,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:opacity-60 disabled:cursor-not-allowed",
        buttonVariants[variant],
        buttonSizes[size],
        iconOnly && "w-8 h-8 px-0",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";

interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  tone?: "default" | "primary" | "danger";
  size?: "sm" | "md";
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { active, tone = "default", size = "sm", className, children, ...props },
    ref
  ) => {
    const baseTone =
      tone === "primary"
        ? "text-zinc-900 dark:text-zinc-50"
        : tone === "danger"
        ? "text-red-500"
        : "text-zinc-500 dark:text-zinc-400";
    const activeTone =
      tone === "primary"
        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
        : tone === "danger"
        ? "bg-red-500 text-white shadow-sm"
        : "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white";
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 disabled:opacity-60 disabled:cursor-not-allowed",
          size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm",
          active ? activeTone : baseTone,
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, ...props }, ref) => (
    <label
      className={cn(
        "inline-flex items-center gap-2 text-[11px] font-semibold text-zinc-500 select-none",
        className
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        className="h-4 w-4 rounded border border-zinc-300 dark:border-zinc-600 accent-zinc-900 dark:accent-zinc-100"
        {...props}
      />
      <span className="text-[11px] uppercase tracking-wide">{label}</span>
      {description && (
        <span className="text-[10px] text-zinc-400">{description}</span>
      )}
    </label>
  )
);
Checkbox.displayName = "Checkbox";

interface FieldProps {
  label?: React.ReactNode;
  action?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  layout?: "stacked" | "inline";
  gap?: "sm" | "md";
}

export const FormField: React.FC<FieldProps> = ({
  label,
  action,
  description,
  children,
  className,
  layout = "stacked",
  gap = "md",
}) => (
  <div
    className={cn(
      "flex",
      layout === "stacked" ? "flex-col" : "items-center",
      gap === "md" ? "gap-2" : "gap-1",
      className
    )}
  >
    {label && (
      <div className="flex items-center justify-between w-full">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
          {label}
        </span>
        {action}
      </div>
    )}
    {description && <p className="text-[10px] text-zinc-500">{description}</p>}
    {children}
  </div>
);

export interface SliderProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  thickness?: keyof typeof sliderHeights;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, thickness = "thin", ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      className={cn(
        "flex-1 appearance-none rounded-full bg-zinc-200 dark:bg-zinc-700 accent-zinc-900 dark:accent-zinc-100",
        sliderHeights[thickness],
        className
      )}
      {...props}
    />
  )
);
Slider.displayName = "Slider";

interface ValueSliderProps {
  value: number;
  onChange: (value: number) => void;
  sliderProps?: SliderProps;
  numberInputProps?: NumberInputProps;
  format?: (value: number) => string;
  parse?: (value: string) => number;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  displayWidth?: number;
}

export const ValueSlider: React.FC<ValueSliderProps> = ({
  value,
  onChange,
  sliderProps,
  numberInputProps,
  format,
  parse,
  suffix,
  min,
  max,
  step,
  displayWidth = 48,
}) => {
  const { className: numberInputClassName, ...restNumberInputProps } =
    numberInputProps || {};
  const { className: sliderClassName, ...restSliderProps } = sliderProps || {};
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseFloat(e.target.value);
    if (!Number.isNaN(next)) onChange(next);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = parse ? parse(e.target.value) : parseFloat(e.target.value);
    if (Number.isNaN(next)) return;
    onChange(next);
  };

  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      <Slider
        value={value}
        onChange={handleSliderChange}
        min={min}
        max={max}
        step={step}
        className={cn("flex-1 min-w-0", sliderClassName)}
        {...restSliderProps}
      />
      <div className="relative" style={{ width: displayWidth }}>
        <NumberInput
          value={format ? format(value) : value}
          onChange={handleInputChange}
          size="xs"
          className={cn("text-center", numberInputClassName)}
          {...restNumberInputProps}
        />
        {suffix && (
          <span className="absolute inset-y-0 right-1 flex items-center text-[9px] text-zinc-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

interface SegmentedOption {
  label: React.ReactNode;
  value: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  size = "sm",
  className,
}) => (
  <div
    className={cn(
      "inline-flex items-center rounded-lg bg-zinc-100 p-0.5 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800",
      className
    )}
  >
    {options.map((option) => {
      const isActive = option.value === value;
      return (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex items-center gap-1 rounded-md transition-colors",
            size === "sm" ? "px-2 py-1" : "px-3 py-1.5",
            isActive
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
              : "text-zinc-400"
          )}
        >
          {option.icon}
          {option.label}
        </button>
      );
    })}
  </div>
);

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
  allowText?: boolean;
  className?: string;
  shape?: "circle" | "square";
  inputProps?: TextInputProps;
  swatchSize?: "sm" | "md";
}

export const ColorInput: React.FC<ColorInputProps> = ({
  value,
  onChange,
  allowText = true,
  shape = "circle",
  className,
  inputProps,
  swatchSize = "sm",
}) => {
  const { className: inputClassName, ...restInputProps } = inputProps || {};
  const swatchSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative border border-zinc-200 dark:border-zinc-600 shadow-inner overflow-hidden shrink-0",
          shape === "circle" ? "rounded-full" : "rounded-lg",
          swatchSizes[swatchSize]
        )}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {allowText && (
        <TextInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          size="sm"
          className={cn("font-mono uppercase w-20", inputClassName)}
          {...restInputProps}
        />
      )}
    </div>
  );
};

interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked = false,
  onCheckedChange,
  className,
  disabled,
  ...props
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={(e) => {
      e.preventDefault();
      if (disabled) return;
      onCheckedChange?.(!checked);
    }}
    className={cn(
      "relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20",
      checked ? "bg-zinc-900 dark:bg-zinc-500" : "bg-zinc-300 dark:bg-zinc-700",
      disabled && "opacity-60 cursor-not-allowed",
      className
    )}
    {...props}
  >
    <span
      className={cn(
        "inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform",
        checked ? "translate-x-4" : "translate-x-1"
      )}
    />
  </button>
);

interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  muted?: boolean;
  open?: boolean;
  onToggle?: (open: boolean) => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  actions,
  collapsible,
  defaultOpen = true,
  muted,
  open,
  onToggle,
  children,
  className,
}) => {
  const baseClasses = cn(
    "rounded-2xl border border-zinc-100 dark:border-zinc-800 p-3",
    muted
      ? "bg-zinc-50/70 dark:bg-zinc-800/40"
      : "bg-white/80 dark:bg-zinc-900/50",
    className
  );

  if (collapsible) {
    const isControlled = typeof open === "boolean";
    const handleToggle = (next: boolean) => {
      onToggle?.(next);
    };

    return (
      <details
        open={isControlled ? open : defaultOpen}
        className={cn(baseClasses, "group")}
        onToggle={(e) => {
          if (isControlled) {
            e.preventDefault();
            return;
          }
          handleToggle(e.currentTarget.open);
        }}
      >
        <summary
          className="flex items-center justify-between cursor-pointer select-none [&::-webkit-details-marker]:hidden"
          onClick={(e) => {
            if (isControlled) {
              e.preventDefault();
              handleToggle(!open);
            }
          }}
        >
          <span className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
            <span
              className={cn(
                "text-[10px] text-zinc-400 transition-transform",
                isControlled
                  ? open
                    ? "rotate-180"
                    : "rotate-0"
                  : "group-open:rotate-180"
              )}
            >
              ▾
            </span>
            {title}
          </span>
          {actions && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2"
            >
              {actions}
            </div>
          )}
        </summary>
        <div className="mt-3 space-y-3">{children}</div>
      </details>
    );
  }

  return (
    <div className={baseClasses}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
          {title}
        </span>
        {actions}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
};

export const SectionDivider: React.FC = () => (
  <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-6" />
);
