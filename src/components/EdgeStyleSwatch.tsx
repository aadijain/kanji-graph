import { EDGE_STYLE, EDGE_STYLE_PARAMS } from "../lib/constants";
import type { EdgeType } from "../types";

// Small inline-SVG preview of an edge type's line style + color. Shared by the
// Legend and InfoModal so both stay in sync with EDGE_STYLE / EDGE_STYLE_PARAMS.

const W = 26;
const H = 10;
const MID = H / 2;

// Samples a zigzag/wavy line across the swatch width, mirroring the canvas
// renderer's wave shaping so the preview matches what's drawn on the graph.
function modulatedPoints(kind: "zigzag" | "wavy"): string {
  const periods = Math.max(1, Math.round(W / EDGE_STYLE_PARAMS[kind].wavelength));
  const amp = kind === "zigzag" ? 2.6 : 2.4;
  const samples = periods * 12;
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const phase = t * periods * 2 * Math.PI;
    const wave = kind === "wavy"
      ? Math.sin(phase)
      : (2 / Math.PI) * Math.asin(Math.sin(phase));
    pts.push(`${(t * W).toFixed(2)},${(MID - amp * wave).toFixed(2)}`);
  }
  return pts.join(" ");
}

// Square-wave points: explicit risers + treads so the corners stay crisp.
function squarePoints(): string {
  const halves = Math.max(1, Math.round(W / EDGE_STYLE_PARAMS.square.wavelength)) * 2;
  const amp = 2.6;
  const pts: string[] = [`0,${MID}`];
  for (let k = 0; k < halves; k++) {
    const y = (MID - amp * (k % 2 === 0 ? 1 : -1)).toFixed(2);
    pts.push(`${((k / halves) * W).toFixed(2)},${y}`);
    pts.push(`${(((k + 1) / halves) * W).toFixed(2)},${y}`);
  }
  pts.push(`${W},${MID}`);
  return pts.join(" ");
}

export default function EdgeStyleSwatch({
  type,
  color,
  className,
}: {
  type: EdgeType;
  color: string;
  className?: string;
}) {
  const style = EDGE_STYLE[type];

  let shape;
  switch (style) {
    case "dashed":
      shape = (
        <line x1={0} y1={MID} x2={W} y2={MID} stroke={color} strokeWidth={1.5}
          strokeDasharray={EDGE_STYLE_PARAMS.dashed.dash.join(" ")} />
      );
      break;
    case "dotted":
      shape = (
        <line x1={0} y1={MID} x2={W} y2={MID} stroke={color} strokeWidth={1.8}
          strokeLinecap="round" strokeDasharray={EDGE_STYLE_PARAMS.dotted.dash.join(" ")} />
      );
      break;
    case "dash-dot":
      shape = (
        <line x1={0} y1={MID} x2={W} y2={MID} stroke={color} strokeWidth={1.6}
          strokeLinecap="round" strokeDasharray={EDGE_STYLE_PARAMS["dash-dot"].dash.join(" ")} />
      );
      break;
    case "square":
      shape = (
        <polyline points={squarePoints()} fill="none" stroke={color}
          strokeWidth={1.5} strokeLinejoin="round" />
      );
      break;
    case "zigzag":
      shape = (
        <polyline points={modulatedPoints("zigzag")} fill="none" stroke={color}
          strokeWidth={1.5} strokeLinejoin="round" />
      );
      break;
    case "wavy":
      shape = (
        <polyline points={modulatedPoints("wavy")} fill="none" stroke={color}
          strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      );
      break;
    case "double": {
      const off = EDGE_STYLE_PARAMS.double.gap / 2;
      shape = (
        <>
          <line x1={0} y1={MID - off} x2={W} y2={MID - off} stroke={color} strokeWidth={1} />
          <line x1={0} y1={MID + off} x2={W} y2={MID + off} stroke={color} strokeWidth={1} />
        </>
      );
      break;
    }
    case "solid":
    default:
      shape = <line x1={0} y1={MID} x2={W} y2={MID} stroke={color} strokeWidth={1.5} />;
      break;
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden>
      {shape}
    </svg>
  );
}
