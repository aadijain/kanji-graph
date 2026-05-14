import { useRef } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { useStore } from "../store";
import { endpointId, type Edge, type EdgeType, type NeighborData, type WordNode } from "../types";
import { type Settings } from "../lib/settings";
import {
  NODE_COLORS,
  EDGE_TYPE_META,
  ACCENT_COLORS,
  hexToRgba,
  COOLDOWN_TICKS,
  D3_ALPHA_DECAY,
  D3_VELOCITY_DECAY,
  NODE_REL_SIZE,
  FOCUS_RING_RADIUS_MULTIPLIER,
  FOCUS_NODE_RADIUS,
  FOCUS_SHADOW_BLUR,
} from "../lib/constants";
import { NODE_SIZE_VALUES } from "../lib/settings";
import { freqDotR, drawLabel, saveLayout } from "../lib/graphLayout";
import { drawStyledEdge, getEdgeStyle, controlPointOf } from "../lib/edgeStyles";

// Word-view hover/filter/highlight behavior. The four hover states are
// mutually exclusive: setHoveredKanji and setHoveredReading clear each other,
// and `hovered` (a WordNode) is only meaningful when it's not the focused node.
//
// | Hover state         | Edges                          | Neighbors           | Main word                                  | Details panel       |
// |---------------------|--------------------------------|---------------------|--------------------------------------------|---------------------|
// | none                | all shown                      | bridge kanji colored per edge type | selected entry's reading highlighted     | selected entry      |
// | main-word kanji     | bridged edges bold, others dim | matching bold, others muted        | hovered kanji enlarged + colored          | selected entry      |
// | main-word reading   | bridged edges bold, others dim | matching bold, others muted        | hovered reading colored (same-reading)    | hovered reading's entry |
// | neighbor (in focus) | edges to that neighbor bold    | hovered bold, others muted         | bridging kanji/readings colored per type  | selected entry      |
//
// Filter mode is "dim" not "hide": non-matching edges drop to 0.18 alpha, non-matching neighbors render in COLORS.muted.
// Multi-edge pairs (e.g. one shared-kanji + one same-reading edge to the same neighbor) highlight all bridges simultaneously.
// Similar-kanji bridges color the partner kanji in the neighbor's label (not the focused word's kanji).
interface Props {
  fgRef: React.MutableRefObject<ForceGraphMethods | undefined>;
  data: { nodes: WordNode[]; links: Edge[] };
  dims: { w: number; h: number };
  focused: WordNode | null;
  neighbors: Set<string>;
  neighborData: Map<string, NeighborData>;
  adjByType: Map<EdgeType, Map<string, Set<string>>>;
  edgeCurvature: Map<Edge, number>;
  settings: Settings;
  hoveredId: string | null;
  hoveredKanji: string | null;
  hoveredReading: string | null;
  COLORS: typeof NODE_COLORS;
  setHovered: (node: WordNode | null) => void;
  setFocused: (node: WordNode) => void;
  tryApplyPendingFocus: () => void;
}

export default function GraphCanvas({
  fgRef, data, dims, focused, neighbors, neighborData,
  adjByType, edgeCurvature, settings, hoveredId, hoveredKanji,
  hoveredReading, COLORS, setHovered, setFocused, tryApplyPendingFocus,
}: Props) {
  const hoveredRef = useRef<WordNode | null>(null);
  const hoverNeighborsRef = useRef<Set<string>>(new Set());

  // Edge color/width: the focus + hover-state logic shared by the pointer-area
  // hit test (linkWidth prop) and the custom styled rendering (linkCanvasObject).
  // Returns COLORS.edgeHidden / width 0 for edges that should not be drawn.
  const edgeColor = (l: Edge): string => {
    if (!settings.edgeVisibility[l.type]) return COLORS.edgeHidden;
    const s = endpointId(l.source);
    const t = endpointId(l.target);
    const hex = settings.edgeColors[l.type] ?? ACCENT_COLORS[EDGE_TYPE_META[l.type].color];
    if (focused) {
      if (s !== focused.id && t !== focused.id) return COLORS.edgeHidden;
      if (hoveredKanji) {
        if (l.type === "same-reading" || !l.via.includes(hoveredKanji)) return hexToRgba(hex, 0.18);
      }
      if (hoveredReading) {
        if (l.type !== "same-reading" || !l.via.includes(hoveredReading)) return hexToRgba(hex, 0.18);
      }
      if (hoveredId && hoveredId !== focused.id) {
        if (s !== hoveredId && t !== hoveredId) return hexToRgba(hex, 0.18);
      }
      return hexToRgba(hex, 0.85);
    }
    // Graph view, nothing hovered: edges fully hidden (not a faint ambient web).
    // Lets linkVisibility drop every edge before control-point calc + paint.
    if (!hoveredId) return COLORS.edgeHidden;
    return s === hoveredId || t === hoveredId ? hexToRgba(hex, 0.85) : COLORS.edgeHidden;
  };

  const edgeWidth = (l: Edge): number => {
    if (!settings.edgeVisibility[l.type]) return 0;
    const s = endpointId(l.source);
    const t = endpointId(l.target);
    if (focused) {
      if (s !== focused.id && t !== focused.id) return 0;
      if (hoveredKanji && (l.type === "same-reading" || !l.via.includes(hoveredKanji))) return 0.5;
      if (hoveredReading && (l.type !== "same-reading" || !l.via.includes(hoveredReading))) return 0.5;
      if (hoveredId && hoveredId !== focused.id && s !== hoveredId && t !== hoveredId) return 0.5;
      return 1.6;
    }
    if (!hoveredId) return 0;
    return s === hoveredId || t === hoveredId ? 1.4 : 0;
  };

  return (
    <ForceGraph2D
      ref={fgRef}
      width={dims.w}
      height={dims.h}
      graphData={data}
      backgroundColor={COLORS.background}
      cooldownTicks={COOLDOWN_TICKS}
      onEngineStop={() => {
        tryApplyPendingFocus();
        if (!focused) saveLayout(data.nodes as WordNode[]);
      }}
      d3AlphaDecay={D3_ALPHA_DECAY}
      d3VelocityDecay={D3_VELOCITY_DECAY}
      enablePanInteraction={!focused}
      enableZoomInteraction={!focused}
      onBackgroundClick={() => {}}
      // ----- nodes -----
      nodeRelSize={NODE_REL_SIZE}
      onNodeHover={(n) => {
        const node = (n as WordNode | null) ?? null;
        hoveredRef.current = node;
        if (node) {
          const ev = useStore.getState().settings.edgeVisibility;
          const set = new Set<string>();
          for (const [type, m] of adjByType) {
            if (!ev[type]) continue;
            const nbrs = m.get(node.id);
            if (nbrs) for (const id of nbrs) set.add(id);
          }
          hoverNeighborsRef.current = set;
        } else {
          hoverNeighborsRef.current = new Set();
        }
        setHovered(node);
      }}
      onNodeClick={(n) => {
        const node = n as WordNode;
        if (!focused || focused.id !== node.id) setFocused(node);
      }}
      nodeCanvasObjectMode={() => "replace"}
      nodeCanvasObject={(node, ctx, globalScale) => {
        const n = node as WordNode;
        const h = hoveredRef.current;
        const isFocus = focused?.id === n.id;
        const activeNeighbors = focused ? neighbors : hoverNeighborsRef.current;
        const isNeighbor = activeNeighbors.has(n.id);

        if (focused && !isFocus && !isNeighbor) return;

        const isHovered = !focused && h?.id === n.id;
        const isHoverNeighbor = !focused && !!h && isNeighbor;
        const dimmedByHover = !focused && !!h && !isHovered && !isHoverNeighbor;

        const fontSize = NODE_SIZE_VALUES[settings.nodeSize] / globalScale;
        const baseR = settings.nodeSizeByFrequency && n.frequency != null
          ? freqDotR(n.frequency)
          : 3.5;
        const dotR = ((isFocus || isHovered) ? FOCUS_NODE_RADIUS : baseR) / globalScale;

        // dot
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, dotR, 0, Math.PI * 2);
        if (isFocus) {
          ctx.fillStyle = COLORS.focus;
          ctx.shadowColor = COLORS.focusShadow;
          ctx.shadowBlur = FOCUS_SHADOW_BLUR;
        } else if (focused && isNeighbor) {
          const nd = neighborData.get(n.id);
          const via = nd?.via ?? [];
          const dimByKanji = !!hoveredKanji && !via.includes(hoveredKanji);
          const dimByReading = !!hoveredReading && !nd?.sameReadingVia.includes(hoveredReading);
          const dimByNeighborHover = !!hoveredId && hoveredId !== focused.id && n.id !== hoveredId;
          const dotColor = hoveredKanji
            ? settings.edgeColors[nd?.kanjiType.get(hoveredKanji) ?? nd?.primaryType ?? "shared-kanji"]
            : hoveredReading
              ? settings.edgeColors["same-reading"]
              : settings.edgeColors[nd?.primaryType ?? "shared-kanji"];
          ctx.fillStyle = (dimByKanji || dimByReading || dimByNeighborHover) ? COLORS.muted : dotColor;
        } else if (isHovered) {
          ctx.fillStyle = COLORS.bridgeKanjiHi;
        } else if (isHoverNeighbor) {
          ctx.fillStyle = COLORS.bridgeKanji;
        } else if (dimmedByHover) {
          ctx.fillStyle = COLORS.muted;
        } else {
          ctx.fillStyle = COLORS.default;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // soft ring around focus
        if (isFocus) {
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, dotR * FOCUS_RING_RADIUS_MULTIPLIER, 0, Math.PI * 2);
          ctx.strokeStyle = COLORS.focusRing;
          ctx.lineWidth = 1 / globalScale;
          ctx.stroke();
        }

        // label — focus node's label is rendered as HTML overlay instead.
        if (isFocus) return;

        let baseColor = COLORS.default;
        let weight = 500;
        let highlights: Map<string, string> | undefined;

        if (focused && isNeighbor) {
          const nd = neighborData.get(n.id);
          const via = nd?.via ?? [];
          if (hoveredKanji) {
            if (via.includes(hoveredKanji)) {
              baseColor = COLORS.highlight;
              weight = 600;
              // For similar-kanji edges the bridging char in the neighbor's label is
              // the partner kanji (K2), not the hovered kanji (K1) from the focused word.
              const edgeType = nd?.kanjiType.get(hoveredKanji) ?? nd?.primaryType ?? "shared-kanji";
              const labelKanji = edgeType === "similar-kanji"
                ? (nd?.similarKanjiMap.get(hoveredKanji) ?? hoveredKanji)
                : hoveredKanji;
              highlights = new Map([[labelKanji, settings.edgeColors[edgeType]]]);
            } else {
              baseColor = COLORS.muted;
            }
          } else if (hoveredReading) {
            const matchesReading = !!nd?.sameReadingVia.includes(hoveredReading);
            baseColor = matchesReading ? COLORS.highlight : COLORS.muted;
            if (matchesReading) weight = 600;
          } else if (hoveredId && hoveredId !== focused.id && n.id !== hoveredId) {
            baseColor = COLORS.muted;
          } else {
            // Highlight each bridging kanji in its own edge-type color.
            // For similar-kanji bridges, color the partner kanji that appears in
            // the neighbor's word (not the focused word's kanji).
            const isHoveredNeighbor = hoveredId === n.id;
            baseColor = isHoveredNeighbor ? COLORS.highlight : COLORS.neighbor;
            if (isHoveredNeighbor) weight = 600;
            highlights = new Map();
            for (const k of via) {
              const t = nd?.kanjiType.get(k) ?? nd?.primaryType ?? "shared-kanji";
              const labelKanji = t === "similar-kanji"
                ? (nd?.similarKanjiMap.get(k) ?? k)
                : k;
              highlights.set(labelKanji, settings.edgeColors[t]);
            }
          }
        } else if (isHoverNeighbor) {
          baseColor = COLORS.neighbor;
        } else if (dimmedByHover) {
          baseColor = COLORS.muted;
        }

        drawLabel(
          ctx,
          n.word,
          n.x!,
          n.y! + dotR + 2 / globalScale,
          fontSize,
          baseColor,
          weight,
          highlights,
        );
      }}
      nodePointerAreaPaint={(node, color, ctx, globalScale) => {
        const n = node as WordNode;
        const isFocus = focused?.id === n.id;
        const isNeighbor = (focused ? neighbors : hoverNeighborsRef.current).has(n.id);
        if (focused && !isFocus && !isNeighbor) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, 24 / globalScale, 0, Math.PI * 2);
        ctx.fill();
      }}
      // ----- edges -----
      // Visible edges are drawn by linkCanvasObject (per-type line styles).
      // linkVisibility filters hidden edges *before* the library computes
      // curvature control points or calls linkCanvasObject, so an idle graph
      // view (nothing hovered) and focus mode skip ~every edge entirely.
      // linkWidth + linkCurvature are kept only to feed the library's
      // pointer-area hit test, which still backs onLinkClick.
      linkVisibility={(link) => edgeWidth(link as Edge) > 0}
      linkWidth={(link) => edgeWidth(link as Edge)}
      linkCurvature={(link) => edgeCurvature.get(link as Edge) ?? 0}
      linkCanvasObjectMode={() => "replace"}
      linkCanvasObject={(link, ctx, globalScale) => {
        const l = link as Edge;
        const width = edgeWidth(l);
        if (width <= 0) return;
        const color = edgeColor(l);
        if (color === COLORS.edgeHidden) return;
        const src = l.source as WordNode;
        const tgt = l.target as WordNode;
        if (src.x == null || src.y == null || tgt.x == null || tgt.y == null) return;
        drawStyledEdge(
          ctx,
          getEdgeStyle(l),
          color,
          width,
          globalScale,
          { x: src.x, y: src.y },
          { x: tgt.x, y: tgt.y },
          controlPointOf(l),
        );
      }}
      onLinkClick={(link) => {
        if (!focused) return;
        const l = link as Edge;
        const s = endpointId(l.source);
        const t = endpointId(l.target);
        if (s !== focused.id && t !== focused.id) return;
        const otherId = s === focused.id ? t : s;
        const other = (data.nodes as WordNode[]).find((n) => n.id === otherId);
        if (other) setFocused(other);
      }}
    />
  );
}
