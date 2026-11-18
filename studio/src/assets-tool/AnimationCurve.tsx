import { Input } from '@asset/ui';
import { useEffect, useState } from 'react';

type Curve = [number, number, number, number];
const labels = ['x1', 'y1', 'x2', 'y2'];

function Coordinate({ value, index, onChange }: { value: number; index: number; onChange: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return <Input type="number" aria-label={`Curve ${labels[index]}`} value={draft} min={index % 2 ? -1 : 0} max={index % 2 ? 2 : 1} step={.01}
    onChange={event => { setDraft(event.target.value); if (event.target.value !== '' && Number.isFinite(event.target.valueAsNumber)) onChange(event.target.valueAsNumber); }}
    onBlur={() => setDraft(String(value))} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}/>
}

/** Two draggable handles, with precise, keyboard-accessible coordinates. */
export function AnimationCurve({ value, onChange }: { value: Curve; onChange: (curve: Curve) => void }) {
  const point = (x: number, y: number) => `${12 + x * 156},${80 - y * 40}`;
  const update = (index: number, n: number) => {
    const next = [...value] as Curve;
    next[index] = Math.round(Math.max(index % 2 ? -1 : 0, Math.min(index % 2 ? 2 : 1, n)) * 100) / 100;
    onChange(next);
  };
  return <div className="asset-animation-curve">
    <svg viewBox="0 0 180 120" aria-label="Custom animation curve">
      <path d="M12 40H168M12 80H168M12 40V80M168 40V80" fill="none" stroke="var(--ui-border)"/>
      <path d={`M12 80L${point(value[0], value[1])}M168 40L${point(value[2], value[3])}`} fill="none" stroke="var(--ui-text-muted)"/>
      <path d={`M12 80C${point(value[0], value[1])} ${point(value[2], value[3])} 168 40`} fill="none" stroke="currentColor" strokeWidth="1.5"/>
      {[0, 2].map(index => <circle key={index} cx={12 + value[index] * 156} cy={80 - value[index + 1] * 40} r="4" fill="var(--ui-bg)" stroke="currentColor" strokeWidth="1.5" style={{ cursor: 'grab', touchAction: 'none' }}
        onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={event => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const svg = event.currentTarget.ownerSVGElement!, matrix = svg.getScreenCTM();
          if (!matrix) return;
          const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
          const next = [...value] as Curve;
          next[index] = Math.round(Math.max(0, Math.min(1, (p.x - 12) / 156)) * 100) / 100;
          next[index + 1] = Math.round(Math.max(-1, Math.min(2, (80 - p.y) / 40)) * 100) / 100;
          onChange(next);
        }}/>) }
    </svg>
    <div className="asset-animation-coordinates">{value.map((n, i) => <label key={i}>
      <span>{labels[i]}</span>
      <Coordinate value={n} index={i} onChange={value => update(i, value)}/>
    </label>)}</div>
  </div>;
}
