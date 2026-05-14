// Edge line-style rendering. Draws one edge between two node positions in
// a chosen stroke style. Pure canvas drawing -- no React, no store.
//
// react-force-graph-2d offers a native linkLineDash prop (dashed/dotted only);
// zigzag, wavy and double need custom paths, so all styles are unified here and
// wired in via GraphCanvas's linkCanvasObject (replace mode). The library still
// computes curvature control points for every visible link *before* the custom
// paints run, so curved (parallel) edges are honored by reading link.__controlPoints.
//
// EDGE_STYLE_PARAMS values are in screen pixels; like the library's own linkWidth
// they are divided by globalScale here so the rendered look is zoom-stable.

import { EDGE_STYLE_PARAMS, type EdgeStyle } from "./constants";

interface Pt { x: number; y: number }

// react-force-graph stashes the quadratic-bezier control point on each link (or
// null for a straight edge), computed for all visible links before
// linkCanvasObject runs. Resolving it here decouples callers from the
// (undocumented) __controlPoints field name. null = straight edge.
export function controlPointOf(link: unknown): Pt | null {
  const cp = (link as { __controlPoints?: number[] | null }).__controlPoints;
  return cp && cp.length >= 2 ? { x: cp[0], y: cp[1] } : null;
}

// Point on the edge centerline at parameter t in [0, 1].
function pointAt(start: Pt, end: Pt, control: Pt | null, t: number): Pt {
  if (!control) {
    return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
  }
  const u = 1 - t;
  return {
    x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
    y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
  };
}

// Unit tangent of the centerline at parameter t.
function tangentAt(start: Pt, end: Pt, control: Pt | null, t: number): Pt {
  let dx: number, dy: number;
  if (!control) {
    dx = end.x - start.x;
    dy = end.y - start.y;
  } else {
    const u = 1 - t;
    dx = 2 * u * (control.x - start.x) + 2 * t * (end.x - control.x);
    dy = 2 * u * (control.y - start.y) + 2 * t * (end.y - control.y);
  }
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

// Traces the bare centerline (straight line or quadratic curve) into the path.
function traceCenterline(ctx: CanvasRenderingContext2D, start: Pt, end: Pt, control: Pt | null) {
  ctx.moveTo(start.x, start.y);
  if (control) ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
  else ctx.lineTo(end.x, end.y);
}

// zigzag/wavy: sample the centerline and displace each sample perpendicular to
// the local tangent. An integer period count keeps the offset at exactly 0 on
// both endpoints so the stroke still meets the node dots cleanly.
function traceModulated(
  ctx: CanvasRenderingContext2D, start: Pt, end: Pt, control: Pt | null,
  amplitude: number, wavelength: number, kind: "zigzag" | "wavy",
) {
  const chord = Math.hypot(end.x - start.x, end.y - start.y);
  const periods = Math.max(1, Math.round(chord / wavelength));
  const samples = Math.max(periods * 10, 8);
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const base = pointAt(start, end, control, t);
    const tan = tangentAt(start, end, control, t);
    const phase = t * periods * 2 * Math.PI;
    // wavy: plain sine. zigzag: smooth triangle wave. Both are 0 at t=0 and t=1.
    const wave = kind === "wavy"
      ? Math.sin(phase)
      : (2 / Math.PI) * Math.asin(Math.sin(phase));
    const off = amplitude * wave;
    const x = base.x - tan.y * off;
    const y = base.y + tan.x * off;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
}

// "square" wave style: like zigzag but with right-angle corners. Emits explicit
// risers + treads rather than sampling a function, so the corners stay crisp.
function traceSquare(
  ctx: CanvasRenderingContext2D, start: Pt, end: Pt, control: Pt | null,
  amplitude: number, wavelength: number,
) {
  const chord = Math.hypot(end.x - start.x, end.y - start.y);
  const halves = Math.max(1, Math.round(chord / wavelength)) * 2;
  const emit = (t: number, off: number, move: boolean) => {
    const base = pointAt(start, end, control, t);
    const tan = tangentAt(start, end, control, t);
    const x = base.x - tan.y * off;
    const y = base.y + tan.x * off;
    if (move) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  };
  emit(0, 0, true); // start on the centerline so the stroke meets the node dot
  for (let k = 0; k < halves; k++) {
    const level = amplitude * (k % 2 === 0 ? 1 : -1);
    emit(k / halves, level, false);       // riser
    emit((k + 1) / halves, level, false); // tread
  }
  emit(1, 0, false); // back to the centerline at the far endpoint
}

// One rail of a double line: the centerline shifted perpendicular by `offset`.
function traceOffset(
  ctx: CanvasRenderingContext2D, start: Pt, end: Pt, control: Pt | null, offset: number,
) {
  const ts = tangentAt(start, end, control, 0);
  const te = tangentAt(start, end, control, 1);
  ctx.moveTo(start.x - ts.y * offset, start.y + ts.x * offset);
  const ex = end.x - te.y * offset;
  const ey = end.y + te.x * offset;
  if (control) {
    const tm = tangentAt(start, end, control, 0.5);
    ctx.quadraticCurveTo(control.x - tm.y * offset, control.y + tm.x * offset, ex, ey);
  } else {
    ctx.lineTo(ex, ey);
  }
}

// Strokes one edge in the given style. `screenWidth` and the EDGE_STYLE_PARAMS
// lengths are in screen px and divided by globalScale to match library linkWidth.
export function drawStyledEdge(
  ctx: CanvasRenderingContext2D,
  style: EdgeStyle,
  color: string,
  screenWidth: number,
  globalScale: number,
  start: Pt,
  end: Pt,
  control: Pt | null,
) {
  const s = globalScale || 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = screenWidth / s;
  ctx.lineCap = style === "dotted" || style === "dash-dot" ? "round" : "butt";
  ctx.lineJoin = "round";
  ctx.beginPath();

  switch (style) {
    case "dashed":
    case "dotted":
    case "dash-dot": {
      ctx.setLineDash(EDGE_STYLE_PARAMS[style].dash.map((d) => d / s));
      traceCenterline(ctx, start, end, control);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case "zigzag":
    case "wavy": {
      const p = EDGE_STYLE_PARAMS[style];
      traceModulated(ctx, start, end, control, p.amplitude / s, p.wavelength / s, style);
      ctx.stroke();
      break;
    }
    case "square": {
      const p = EDGE_STYLE_PARAMS.square;
      traceSquare(ctx, start, end, control, p.amplitude / s, p.wavelength / s);
      ctx.stroke();
      break;
    }
    case "double": {
      const half = EDGE_STYLE_PARAMS.double.gap / 2 / s;
      traceOffset(ctx, start, end, control, half);
      traceOffset(ctx, start, end, control, -half);
      ctx.stroke();
      break;
    }
    case "solid":
    default: {
      traceCenterline(ctx, start, end, control);
      ctx.stroke();
      break;
    }
  }
}
