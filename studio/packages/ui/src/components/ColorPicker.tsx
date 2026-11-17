import { Icon } from './Icon';
import {
  createContext,
  forwardRef,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import { cn } from '../lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './Dropdown';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from './Dialog';
import { Button } from './Button';
import { Input } from './Input';

// ============================================================
// Color helpers — hex <-> HSV with alpha
// ============================================================

const TRANSPARENT = 'transparent';

function clamp(n: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}

function normalizeHex(input: string): string | null {
  const v = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]+$/.test(v)) return null;
  if (v.length === 3) {
    return ('#' + v.split('').map((c) => c + c).join('')).toLowerCase();
  }
  if (v.length === 6 || v.length === 8) return ('#' + v).toLowerCase();
  return null;
}

type Hsv = { h: number; s: number; v: number; a: number };

function hexToHsv(hex: string): Hsv {
  if (hex === TRANSPARENT) return { h: 0, s: 0, v: 1, a: 0 };
  const norm = normalizeHex(hex) ?? '#000000';
  const m = norm.slice(1);
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const a = m.length === 8 ? parseInt(m.slice(6, 8), 16) / 255 : 1;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max, a };
}

function hsvToHex({ h, s, v, a }: Hsv, includeAlpha = true): string {
  const c = v * s;
  const hh = (h % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (0 <= hh && hh < 1) { r = c; g = x; b = 0; }
  else if (hh < 2) { r = x; g = c; b = 0; }
  else if (hh < 3) { r = 0; g = c; b = x; }
  else if (hh < 4) { r = 0; g = x; b = c; }
  else if (hh < 5) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const m = v - c;
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0').toLowerCase();
  const base = '#' + toHex(r) + toHex(g) + toHex(b);
  if (!includeAlpha || a >= 1) return base;
  return base + Math.round(a * 255).toString(16).padStart(2, '0').toLowerCase();
}

function colorsEqual(a: string, b: string) {
  if (a === b) return true;
  const na = a === TRANSPARENT ? TRANSPARENT : normalizeHex(a);
  const nb = b === TRANSPARENT ? TRANSPARENT : normalizeHex(b);
  return na !== null && nb !== null && na === nb;
}

// ============================================================
// Defaults — tuned to use design tokens
// ============================================================

const DEFAULT_BRAND_COLORS: string[] = [
  '#0019F4',
  '#FF1F8B',
  '#121722',
  '#0029E6',
  '#0068F9',
  '#F0E2C9',
  '#5641D2',
  '#FF503D',
  '#D7F18C',
];

const DEFAULT_PALETTE_COLORS: string[] = [
  TRANSPARENT,
  '#121722',
  '#5F5F5F',
  '#F15B5B',
  '#349F5F',
  '#0096FF',
  '#FFC01F',
  '#FF8A1E',
];

// ============================================================
// ColorSwatch — round button used as trigger and in grid rows
// ============================================================

export type ColorSwatchProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  color: string;
  /** Visual size in pixels. Default 28. */
  size?: number;
  /** Show a check overlay (selected state). */
  selected?: boolean;
  /** Show as an empty placeholder (dashed ring). */
  empty?: boolean;
  /** Used by DropdownMenuTrigger; mapped to data-active. */
  active?: boolean;
};

export const ColorSwatch = forwardRef<HTMLButtonElement, ColorSwatchProps>(
  function ColorSwatch(
    { color, size = 28, selected, empty, active, className, style, children, ...props },
    ref,
  ) {
    const isTransparent = color === TRANSPARENT;
    const checkColor = useMemo(() => {
      if (isTransparent || empty) return 'var(--ui-text)';
      const { v, s } = hexToHsv(color);
      return v * (1 - s * 0.5) > 0.7 ? 'var(--ui-text)' : '#FFFFFF';
    }, [color, isTransparent, empty]);

    return (
      <button
        ref={ref}
        type="button"
        className={cn('ui-reset', 'ui-color-swatch', className)}
        data-transparent={isTransparent ? '' : undefined}
        data-empty={empty ? '' : undefined}
        data-selected={selected ? '' : undefined}
        data-active={active ? '' : undefined}
        style={{
          width: `var(--ui-color-field-swatch-size, ${size}px)`,
          height: `var(--ui-color-field-swatch-size, ${size}px)`,
          background: isTransparent || empty ? undefined : color,
          ...style,
        }}
        {...props}
      >
        {selected && !empty && (
          <Icon name="check" size={14} color={checkColor} />
        )}
        {children}
      </button>
    );
  },
);

// ============================================================
// ColorPicker — popover with brand / custom / palette groups
// ============================================================

export type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  brandColors?: string[];
  paletteColors?: string[];
  customColors?: string[];
  /** Called with the picked hex when the user adds a new custom color. */
  onAddCustomColor?: (hex: string) => void;
  /** Called when an existing custom swatch is edited via the dialog. */
  onUpdateCustomColor?: (index: number, hex: string) => void;
  /** Maximum number of custom slots to render (empty placeholders fill remaining). */
  customSlots?: number;
  /** Show or hide each section. */
  showBrand?: boolean;
  showCustom?: boolean;
  showPalette?: boolean;
  /** Custom trigger element. Default: a `ColorSwatch` of the current value. */
  trigger?: ReactElement<{ onClick?: () => void; active?: boolean }>;
  /** Sizing for default trigger swatch. Default 24. */
  triggerSize?: number;
  align?: 'start' | 'end';
  placement?: 'top' | 'bottom';
  /** Heading shown above brand colors. */
  brandLabel?: ReactNode;
  customLabel?: ReactNode;
  paletteLabel?: ReactNode;
};

/** Opt-in palette scope for an editor, including its portalled Design panels. */
export type ColorPickerPalette = Pick<ColorPickerProps, 'brandColors' | 'paletteColors' | 'showBrand' | 'showCustom' | 'showPalette' | 'brandLabel' | 'paletteLabel'> & {
  resolveColor?: (color: string) => string;
};
const ColorPickerPaletteContext = createContext<ColorPickerPalette | null>(null);
export function ColorPickerPaletteProvider({ value, children }: { value: ColorPickerPalette; children: ReactNode }) {
  return <ColorPickerPaletteContext.Provider value={value}>{children}</ColorPickerPaletteContext.Provider>;
}

export function ColorPicker(props: ColorPickerProps) {
  const palette = useContext(ColorPickerPaletteContext);
  const {
    value,
    onChange,
    brandColors = DEFAULT_BRAND_COLORS,
    paletteColors = DEFAULT_PALETTE_COLORS,
    customColors = [],
    onAddCustomColor,
    onUpdateCustomColor,
    customSlots = 4,
    showBrand = true,
    showCustom = true,
    showPalette = true,
    trigger,
    triggerSize = 24,
    align = 'start',
    placement = 'bottom',
    brandLabel = 'Brand',
    customLabel = 'Custom',
    paletteLabel = 'Asset palette',
  } = { ...props, ...palette };
  const selectedColor = palette?.resolveColor?.(value) ?? value;
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [seedColor, setSeedColor] = useState<string>('#0068F9');

  const select = (color: string) => {
    onChange(color);
    setPopoverOpen(false);
  };

  const openCreate = () => {
    setEditingIndex(null);
    setSeedColor(value && value !== TRANSPARENT ? value : '#0068F9');
    setPopoverOpen(false);
    setDialogOpen(true);
  };

  const openEdit = (idx: number) => {
    setEditingIndex(idx);
    setSeedColor(customColors[idx] ?? '#0068F9');
    setPopoverOpen(false);
    setDialogOpen(true);
  };

  const handleApply = (hex: string) => {
    if (editingIndex == null) {
      onAddCustomColor?.(hex);
    } else {
      onUpdateCustomColor?.(editingIndex, hex);
    }
    onChange(hex);
    setDialogOpen(false);
  };

  const defaultTrigger = (
    <ColorSwatch color={value || TRANSPARENT} size={triggerSize} aria-label="Pick a color" />
  );

  const emptySlots = Math.max(0, customSlots - customColors.length);

  return (
    <>
      <DropdownMenu open={popoverOpen} onOpenChange={setPopoverOpen}>
        <DropdownMenuTrigger>{trigger ?? defaultTrigger}</DropdownMenuTrigger>
        <DropdownMenuContent
          className="ui-color-popover"
          side={placement}
          align={align}
          fit
        >
          {showBrand && (
            <ColorSection label={brandLabel}>
              <ColorGrid>
                {brandColors.map((c) => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    selected={colorsEqual(c, selectedColor)}
                    onClick={() => select(c)}
                    aria-label={c}
                  />
                ))}
              </ColorGrid>
            </ColorSection>
          )}

          {showCustom && (
            <ColorSection label={customLabel}>
              <ColorGrid>
                <button
                  type="button"
                  className="ui-reset ui-color-swatch ui-color-add"
                  onClick={openCreate}
                  aria-label="Add custom color"
                >
                  <Icon name="plus" size={10} />
                </button>
                <button
                  type="button"
                  className="ui-reset ui-color-swatch ui-color-edit"
                  onClick={() =>
                    customColors.length > 0 ? openEdit(customColors.length - 1) : openCreate()
                  }
                  aria-label="Edit custom color"
                  disabled={customColors.length === 0 && !onAddCustomColor}
                >
                  <Icon name="pencil" size={10} />
                </button>
                {customColors.map((c, i) => (
                  <ColorSwatch
                    key={`${c}-${i}`}
                    color={c}
                    selected={colorsEqual(c, selectedColor)}
                    onClick={() => select(c)}
                    aria-label={c}
                  />
                ))}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <ColorSwatch
                    key={`empty-${i}`}
                    color={TRANSPARENT}
                    empty
                    onClick={openCreate}
                    aria-label="Empty slot — add color"
                  />
                ))}
              </ColorGrid>
            </ColorSection>
          )}

          {showPalette && (
            <ColorSection label={paletteLabel}>
              <ColorGrid>
                {paletteColors.map((c) => (
                  <ColorSwatch
                    key={c}
                    color={c}
                    selected={colorsEqual(c, selectedColor)}
                    onClick={() => select(c)}
                    aria-label={c === TRANSPARENT ? 'Transparent' : c}
                  />
                ))}
              </ColorGrid>
            </ColorSection>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ColorPickerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        value={seedColor}
        onApply={handleApply}
        title={editingIndex == null ? 'Custom color' : 'Edit color'}
      />
    </>
  );
}

function ColorSection({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="ui-color-section">
      <div className="ui-color-section-label">{label}</div>
      {children}
    </div>
  );
}

function ColorGrid({ children }: { children: ReactNode }) {
  return <div className="ui-color-grid">{children}</div>;
}

// ============================================================
// ColorPickerDialog — HSV pad + hue + alpha + hex
// ============================================================

export type ColorPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  value: string;
  onApply: (hex: string) => void;
  title?: ReactNode;
};

export function ColorPickerDialog({
  open,
  onClose,
  value,
  onApply,
  title = 'Custom color',
}: ColorPickerDialogProps) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value));
  const [hexInput, setHexInput] = useState<string>(() => hsvToHex(hexToHsv(value), false));

  useEffect(() => {
    if (!open) return;
    const next = hexToHsv(value);
    setHsv(next);
    setHexInput(hsvToHex(next, false));
  }, [open, value]);

  const updateHsv = useCallback((next: Partial<Hsv>) => {
    setHsv((prev) => {
      const merged = { ...prev, ...next };
      setHexInput(hsvToHex(merged, false));
      return merged;
    });
  }, []);

  const onHexChange = (raw: string) => {
    setHexInput(raw);
    const norm = normalizeHex(raw);
    if (norm) {
      const parsed = hexToHsv(norm);
      setHsv((prev) => ({ ...parsed, a: prev.a }));
    }
  };

  const stepHex = (delta: number) => {
    const norm = normalizeHex(hexInput);
    if (!norm) return;
    const num = parseInt(norm.slice(1, 7), 16);
    const next = clamp(num + delta, 0, 0xffffff);
    const hex = '#' + next.toString(16).padStart(6, '0').toLowerCase();
    onHexChange(hex);
  };

  const previewHex = hsvToHex(hsv, true);
  const baseHex = hsvToHex({ ...hsv, a: 1 }, false);
  const hueHex = hsvToHex({ h: hsv.h, s: 1, v: 1, a: 1 }, false);

  const apply = () => {
    onApply(hsv.a >= 1 ? hsvToHex(hsv, false) : hsvToHex(hsv, true));
  };

  return (
    <Dialog open={open} onClose={onClose} size="sm" width={420}>
      <DialogHeader title={title} onClose={onClose} />
      <DialogBody>
        <div className="ui-color-dialog-body">
          <SvPad
            h={hsv.h}
            s={hsv.s}
            v={hsv.v}
            onChange={(s, v) => updateHsv({ s, v })}
          />

          <div className="ui-color-sliders">
            <div
              className="ui-color-preview"
              style={{ background: previewHex }}
              data-transparent={hsv.a < 1 ? '' : undefined}
            />
            <div className="ui-color-sliders-stack">
              <HueSlider hue={hsv.h} onChange={(h) => updateHsv({ h })} />
              <AlphaSlider
                alpha={hsv.a}
                baseHex={baseHex}
                hueHex={hueHex}
                onChange={(a) => updateHsv({ a })}
              />
            </div>
          </div>

          <div className="ui-color-hex">
            <Input
              inputSize="md"
              aria-label="Hex color"
              value={hexInput.replace(/^#/, '#')}
              onChange={(e) => onHexChange(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            <div className="ui-color-hex-steppers-stack">
              <button
                type="button"
                className="ui-reset ui-color-hex-stepper"
                onClick={() => stepHex(1)}
                aria-label="Increment hex"
              >
                <Icon name="chevron-up" size={10} />
              </button>
              <button
                type="button"
                className="ui-reset ui-color-hex-stepper"
                onClick={() => stepHex(-1)}
                aria-label="Decrement hex"
              >
                <Icon name="chevron-down" size={10} />
              </button>
            </div>
          </div>
          <div className="ui-color-hex-label">Hex</div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="neutral" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={apply}>
          Apply
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ============================================================
// SV pad — saturation × value canvas
// ============================================================

function SvPad({
  h,
  s,
  v,
  onChange,
}: {
  h: number;
  s: number;
  v: number;
  onChange: (s: number, v: number) => void;
}) {
  const padRef = useRef<HTMLDivElement | null>(null);

  const setFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const node = padRef.current;
      if (!node) return;
      const r = node.getBoundingClientRect();
      const ns = clamp((clientX - r.left) / r.width);
      const nv = clamp(1 - (clientY - r.top) / r.height);
      onChange(ns, nv);
    },
    [onChange],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setFromEvent(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    setFromEvent(e.clientX, e.clientY);
  };

  const hueColor = hsvToHex({ h, s: 1, v: 1, a: 1 }, false);

  return (
    <div
      ref={padRef}
      className="ui-color-sv"
      style={{ background: hueColor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      role="slider"
      aria-label="Saturation and brightness"
      aria-valuetext={`s=${Math.round(s * 100)}, v=${Math.round(v * 100)}`}
    >
      <div className="ui-color-sv-saturation" />
      <div className="ui-color-sv-value" />
      <div
        className="ui-color-sv-cursor"
        style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%` }}
      />
    </div>
  );
}

// ============================================================
// Hue slider
// ============================================================

function HueSlider({ hue, onChange }: { hue: number; onChange: (h: number) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);

  const setFromEvent = useCallback(
    (clientX: number) => {
      const node = ref.current;
      if (!node) return;
      const r = node.getBoundingClientRect();
      onChange(clamp((clientX - r.left) / r.width) * 360);
    },
    [onChange],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setFromEvent(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    setFromEvent(e.clientX);
  };

  return (
    <div
      ref={ref}
      className="ui-color-slider ui-color-slider-hue"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      role="slider"
      aria-label="Hue"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(hue)}
    >
      <div className="ui-color-slider-thumb" style={{ left: `${(hue / 360) * 100}%` }} />
    </div>
  );
}

// ============================================================
// Alpha slider
// ============================================================

function AlphaSlider({
  alpha,
  baseHex,
  hueHex: _hueHex,
  onChange,
}: {
  alpha: number;
  baseHex: string;
  hueHex: string;
  onChange: (a: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const setFromEvent = useCallback(
    (clientX: number) => {
      const node = ref.current;
      if (!node) return;
      const r = node.getBoundingClientRect();
      onChange(clamp((clientX - r.left) / r.width));
    },
    [onChange],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setFromEvent(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    setFromEvent(e.clientX);
  };

  const fillStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(to right, ${baseHex}00, ${baseHex}FF)`,
  };

  return (
    <div
      ref={ref}
      className="ui-color-slider ui-color-slider-alpha"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      role="slider"
      aria-label="Opacity"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(alpha * 100)}
    >
      <div className="ui-color-slider-fill" style={fillStyle} />
      <div className="ui-color-slider-thumb" style={{ left: `${alpha * 100}%` }} />
    </div>
  );
}
