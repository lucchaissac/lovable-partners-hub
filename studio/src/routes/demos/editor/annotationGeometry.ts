export type Point = { x: number; y: number };
export type ShapeTool = 'rectangle' | 'oval' | 'arrow' | 'line';
export type DrawingTool = 'draw' | ShapeTool;
export type Stroke = { id?: string; kind: DrawingTool; points: Point[]; color: string; head?: Point[]; fill?: string; strokeWidth?: number; radius?: number; opacity?: number; content?: string; busy?: boolean };
export type ShapeRequest = { shapeId: string; shapeName: string; text: string; image: string };
export type ShapeResult = { reply: string; content?: string };
export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

export const SHAPE_TOOLS = [
  { id: 'rectangle', icon: 'rectangle-horizontal', label: 'Rectangle', shortcut: 'R' },
  { id: 'oval', icon: 'circle', label: 'Oval', shortcut: 'O' },
  { id: 'arrow', icon: 'arrow-up-right', label: 'Arrow', shortcut: '⇧ L' },
  { id: 'line', icon: 'slash', label: 'Line', shortcut: 'L' },
] as const;

export const isShapeTool = (tool: string): tool is ShapeTool => SHAPE_TOOLS.some(shape => shape.id === tool);
export const isDrawingTool = (tool: string): tool is DrawingTool => tool === 'draw' || isShapeTool(tool);

/** Points use a 1000 × 1000 coordinate space. Compute arrowheads in pixels so
 * their angle stays correct on both a long editor page and a portrait asset. */
export function updateStroke(stroke: Stroke, end: Point, size: { width: number; height: number }): Stroke {
  if (stroke.kind === 'draw') return { ...stroke, points: [...stroke.points, end] };
  const start = stroke.points[0];
  if (stroke.kind !== 'arrow') return { ...stroke, points: [start, end] };
  const dx = (end.x - start.x) * size.width / 1000;
  const dy = (end.y - start.y) * size.height / 1000;
  const length = Math.hypot(dx, dy);
  if (!length || !size.width || !size.height) return { ...stroke, points: [start, end], head: [] };
  const ux = dx / length; const uy = dy / length;
  const arm = Math.min(14, length * .4);
  const side = arm * .5;
  const wing = (direction: number) => ({
    x: end.x + (-ux * arm + direction * -uy * side) * 1000 / size.width,
    y: end.y + (-uy * arm + direction * ux * side) * 1000 / size.height,
  });
  return { ...stroke, points: [start, end], head: [wing(1), end, wing(-1)] };
}

export function shapeBounds(points: Point[]) {
  const [start, end = start] = points;
  return { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
}

export function moveShape(stroke: Stroke, delta: Point): Stroke {
  const box = shapeBounds(stroke.points);
  const dx = Math.max(-box.x, Math.min(1000 - box.x - box.width, delta.x));
  const dy = Math.max(-box.y, Math.min(1000 - box.y - box.height, delta.y));
  const move = (p: Point) => ({ x: p.x + dx, y: p.y + dy });
  return { ...stroke, points: stroke.points.map(move), head: stroke.head?.map(move) };
}

export function resizeShape(stroke: Stroke, corner: ResizeCorner, point: Point, size: { width: number; height: number }): Stroke {
  const box = shapeBounds(stroke.points);
  const minimum = { x: 24 / size.width * 1000, y: 24 / size.height * 1000 };
  const left = corner.includes('w') ? Math.max(0, Math.min(box.x + box.width - minimum.x, point.x)) : box.x;
  const top = corner.includes('n') ? Math.max(0, Math.min(box.y + box.height - minimum.y, point.y)) : box.y;
  const right = corner.includes('e') ? Math.min(1000, Math.max(left + minimum.x, point.x)) : box.x + box.width;
  const bottom = corner.includes('s') ? Math.min(1000, Math.max(top + minimum.y, point.y)) : box.y + box.height;
  const points = stroke.points.map((p, index) => ({ x: left + (box.width ? (p.x - box.x) / box.width : index === 0 ? 0 : 1) * (right - left), y: top + (box.height ? (p.y - box.y) / box.height : index === 0 ? 0 : 1) * (bottom - top) }));
  const resized = { ...stroke, points };
  return stroke.kind === 'arrow' ? updateStroke(resized, points.at(-1)!, size) : resized;
}
