import { useEffect, useMemo, useRef } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { useStore } from "../store";
import { endpointId, type Edge, type WordNode } from "../types";
import { tween } from "../lib/animation";
import { radialAround, type XY } from "../lib/layout";
import {
  ANIMATION_MS,
  FOCUS_ZOOM_VALUES,
  NEIGHBOR_RADIUS_VALUES,
  LAYOUT_DENSITY_VALUES,
  NODE_SIZE_VALUES,
} from "../lib/settings";
import {
  LAYOUT_STORAGE_KEY,
  NODE_COLORS,
  EDGE_TYPE_META,
  FONT_FAMILY,
  GRAPH_BG,
  COOLDOWN_TICKS,
  D3_ALPHA_DECAY,
  D3_VELOCITY_DECAY,
  NODE_REL_SIZE,
  FOCUS_RING_RADIUS_MULTIPLIER,
  RESIZE_FIT_MS,
  ENGINE_STOP_FIT_MS,
} from "../lib/constants";

type Pos = { id: string; x: number; y: number };

function loadLayout(): Map<string, Pos> {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return new Map();
    const arr: Pos[] = JSON.parse(raw);
    return new Map(arr.map((p) => [p.id, p]));
  } catch {
    return new Map();
  }
}

function saveLayout(nodes: WordNode[]) {
  const arr: Pos[] = nodes
    .filter((n) => typeof n.x === "number" && typeof n.y === "number")
    .map((n) => ({ id: n.id, x: n.x!, y: n.y! }));
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(arr));
}

const COLORS = NODE_COLORS;

function drawLabel(
  ctx: CanvasRenderingContext2D,
  word: string,
  cx: number,
  cy: number,
  fontSize: number,
  baseColor: string,
  weight: number,
  highlightSet: Set<string> | undefined,
  highlightColor: string,
) {
  const chars = [...word];
  ctx.font = `${weight} ${fontSize}px ${FONT_FAMILY}`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = cx - total / 2;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    ctx.fillStyle = highlightSet?.has(ch) ? highlightColor : baseColor;
    ctx.fillText(ch, x, cy);
    x += widths[i];
  }
}

export default function Graph() {
  const graph = useStore((s) => s.graph)!;
  const hovered = useStore((s) => s.hovered);
  const setHovered = useStore((s) => s.setHovered);
  const focused = useStore((s) => s.focused);
  const setFocused = useStore((s) => s.setFocused);
  const hoveredKanji = useStore((s) => s.hoveredKanji);
  const hoveredReading = useStore((s) => s.hoveredReading);
  const setTransitioning = useStore((s) => s.setTransitioning);
  const edgeVisibility = useStore((s) => s.settings.edgeVisibility);
  const settings = useStore((s) => s.settings);

  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const cancelTweenRef = useRef<(() => void) | null>(null);
  const cachedPositionsRef = useRef<Map<string, XY>>(new Map());

  // Apply force-layout params whenever density setting changes.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const { linkDistance, chargeStrength } = LAYOUT_DENSITY_VALUES[settings.layoutDensity];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fg.d3Force("link") as any)?.distance?.(linkDistance);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fg.d3Force("charge") as any)?.strength?.(chargeStrength);
    if (!focused) fg.d3ReheatSimulation();
  }, [settings.layoutDensity]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = useMemo(() => {
    const cached = loadLayout();
    const nodes = graph.nodes.map((n) => {
      const p = cached.get(n.id);
      return p ? { ...n, x: p.x, y: p.y } : { ...n };
    });
    return { nodes, links: graph.edges as Edge[] };
  }, [graph]);

  // Active "focal" node for visual styling — focus wins over hover.
  const focal = focused ?? hovered;
  const neighbors = useMemo(() => {
    if (!focal) return new Set<string>();
    const out = new Set<string>();
    for (const e of graph.edges) {
      if (!edgeVisibility[e.type]) continue;
      const s = endpointId(e.source);
      const t = endpointId(e.target);
      if (s === focal.id) out.add(t);
      else if (t === focal.id) out.add(s);
    }
    return out;
  }, [focal, graph.edges, edgeVisibility]);

  // For each neighbor of focused: bridging kanji + which edge type contributed each.
  const neighborData = useMemo(() => {
    type NData = { via: string[]; kanjiType: Map<string, Edge["type"]>; primaryType: Edge["type"]; types: Edge["type"][] };
    const map = new Map<string, { viaSet: Set<string>; kanjiType: Map<string, Edge["type"]>; types: Edge["type"][] }>();
    if (!focused) return new Map<string, NData>();
    for (const e of graph.edges as Edge[]) {
      if (!edgeVisibility[e.type]) continue;
      const s = endpointId(e.source);
      const t = endpointId(e.target);
      if (s !== focused.id && t !== focused.id) continue;
      const other = s === focused.id ? t : s;
      const d = map.get(other) ?? { viaSet: new Set(), kanjiType: new Map(), types: [] as Edge["type"][] };
      d.types.push(e.type);
      if (e.type !== "same-reading") {
        for (const k of e.via) {
          d.viaSet.add(k);
          if (!d.kanjiType.has(k)) d.kanjiType.set(k, e.type);
        }
      }
      map.set(other, d);
    }
    const result = new Map<string, NData>();
    const typePriority: Edge["type"][] = ["shared-kanji", "similar-kanji", "same-reading"];
    for (const [id, d] of map) {
      const primaryType = typePriority.find((t) => d.types.includes(t)) ?? d.types[0];
      result.set(id, { via: [...d.viaSet], kanjiType: d.kanjiType, primaryType, types: d.types });
    }
    return result;
  }, [focused, graph.edges, edgeVisibility]);

  // Smooth transition on focus enter / change / exit.
  useEffect(() => {
    cancelTweenRef.current?.();
    cancelTweenRef.current = null;

    const fg = fgRef.current;
    if (!fg) return;
    const nodes = data.nodes as WordNode[];
    // Read current settings at transition time (not as deps — we don't want to
    // re-tween when a setting changes while already in focus).
    const s = useStore.getState().settings;
    const transitionMs = ANIMATION_MS[s.animationSpeed];
    const focusZoom = FOCUS_ZOOM_VALUES[s.focusZoom];
    const neighborRadius = NEIGHBOR_RADIUS_VALUES[s.neighborSpread];

    if (focused) {
      if (cachedPositionsRef.current.size === 0) {
        for (const n of nodes) {
          if (n.x != null && n.y != null) {
            cachedPositionsRef.current.set(n.id, { x: n.x, y: n.y });
          }
        }
      }

      const focusNode = nodes.find((n) => n.id === focused.id);
      if (!focusNode) return;

      const focusNeighbors = new Set<string>();
      for (const e of graph.edges) {
        const s = endpointId(e.source);
        const t = endpointId(e.target);
        if (s === focused.id) focusNeighbors.add(t);
        else if (t === focused.id) focusNeighbors.add(s);
      }
      const neighborNodes = nodes.filter((n) => focusNeighbors.has(n.id));
      const radial = radialAround(focusNode, neighborNodes, neighborRadius);

      const targets = new Map<string, XY>();
      targets.set(focused.id, { x: focusNode.x ?? 0, y: focusNode.y ?? 0 });
      for (const [id, pos] of radial) targets.set(id, pos);

      const starts = new Map<string, XY>();
      for (const n of nodes) {
        if (n.x != null && n.y != null) starts.set(n.id, { x: n.x, y: n.y });
        // Unpin everything before tween (previous focus may have pinned them).
        n.fx = undefined;
        n.fy = undefined;
      }

      fg.centerAt(focusNode.x ?? 0, focusNode.y ?? 0, transitionMs);
      fg.zoom(focusZoom, transitionMs);
      setTransitioning(true);

      cancelTweenRef.current = tween({
        duration: transitionMs,
        onUpdate: (t) => {
          for (const n of nodes) {
            const start = starts.get(n.id);
            const target = targets.get(n.id);
            if (!start || !target) continue;
            n.x = start.x + (target.x - start.x) * t;
            n.y = start.y + (target.y - start.y) * t;
          }
          (fg as unknown as { refresh?: () => void }).refresh?.();
        },
        onComplete: () => {
          for (const n of nodes) {
            const target = targets.get(n.id);
            if (target) {
              n.fx = target.x;
              n.fy = target.y;
            }
          }
          setTransitioning(false);
        },
      });
    } else {
      const cached = cachedPositionsRef.current;
      if (cached.size === 0) return;

      for (const n of nodes) {
        n.fx = undefined;
        n.fy = undefined;
      }

      const starts = new Map<string, XY>();
      for (const n of nodes) {
        if (n.x != null && n.y != null) starts.set(n.id, { x: n.x, y: n.y });
      }

      setTransitioning(true);
      fg.zoomToFit(transitionMs, 80);

      cancelTweenRef.current = tween({
        duration: transitionMs,
        onUpdate: (t) => {
          for (const n of nodes) {
            const start = starts.get(n.id);
            const target = cached.get(n.id);
            if (!start || !target) continue;
            n.x = start.x + (target.x - start.x) * t;
            n.y = start.y + (target.y - start.y) * t;
          }
          (fg as unknown as { refresh?: () => void }).refresh?.();
        },
        onComplete: () => {
          cachedPositionsRef.current.clear();
          setTransitioning(false);
        },
      });
    }

    return () => {
      cancelTweenRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused?.id]);

  // Resize: refit only in global view.
  useEffect(() => {
    const handle = () => {
      if (!focused) fgRef.current?.zoomToFit(RESIZE_FIT_MS, 80);
    };
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [focused]);

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={data}
      backgroundColor={GRAPH_BG}
      cooldownTicks={COOLDOWN_TICKS}
      onEngineStop={() => {
        if (!focused) {
          saveLayout(data.nodes as WordNode[]);
          fgRef.current?.zoomToFit(ENGINE_STOP_FIT_MS, 80);
        }
      }}
      d3AlphaDecay={D3_ALPHA_DECAY}
      d3VelocityDecay={D3_VELOCITY_DECAY}
      enablePanInteraction={!focused}
      enableZoomInteraction={!focused}
      onBackgroundClick={() => {}}
      // ----- nodes -----
      nodeRelSize={NODE_REL_SIZE}
      onNodeHover={(n) => setHovered((n as WordNode | null) ?? null)}
      onNodeClick={(n) => {
        const node = n as WordNode;
        if (!focused || focused.id !== node.id) setFocused(node);
      }}
      nodeCanvasObjectMode={() => "replace"}
      nodeCanvasObject={(node, ctx, globalScale) => {
        const n = node as WordNode;
        const isFocus = focused?.id === n.id;
        const isNeighbor = neighbors.has(n.id);

        if (focused && !isFocus && !isNeighbor) return; // hide non-relevant

        const isHovered = !focused && hovered?.id === n.id;
        const isHoverNeighbor = !focused && !!hovered && isNeighbor;
        const dimmedByHover =
          !focused && !!hovered && !isHovered && !isHoverNeighbor;

        const fontSize = NODE_SIZE_VALUES[settings.nodeSize] / globalScale;
        const dotR = (isFocus ? 5 : isHovered ? 5 : 3.5) / globalScale;

        // dot
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, dotR, 0, Math.PI * 2);
        if (isFocus) {
          ctx.fillStyle = COLORS.focus;
          ctx.shadowColor = "rgba(255,255,255,0.4)";
          ctx.shadowBlur = 16;
        } else if (focused && isNeighbor) {
          const nd = neighborData.get(n.id);
          const via = nd?.via ?? [];
          const isSameReading = nd?.types.includes("same-reading") ?? false;
          const dimByKanji = !!hoveredKanji && !via.includes(hoveredKanji);
          const dimByReading = hoveredReading && !isSameReading;
          const dotColor = hoveredKanji
            ? EDGE_TYPE_META[nd?.kanjiType.get(hoveredKanji) ?? nd?.primaryType ?? "shared-kanji"].hex
            : hoveredReading
              ? EDGE_TYPE_META["same-reading"].hex
              : EDGE_TYPE_META[nd?.primaryType ?? "shared-kanji"].hex;
          ctx.fillStyle = (dimByKanji || dimByReading) ? COLORS.muted : dotColor;
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
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth = 1 / globalScale;
          ctx.stroke();
        }

        // label — focus node's label is rendered as HTML overlay instead.
        if (isFocus) return;

        let baseColor = COLORS.default;
        let weight = 500;
        let highlightSet: Set<string> | undefined;
        let highlightColor = COLORS.bridgeKanji;

        if (focused && isNeighbor) {
          const nd = neighborData.get(n.id);
          const via = nd?.via ?? [];
          const isSameReading = nd?.types.includes("same-reading") ?? false;
          if (hoveredKanji) {
            if (via.includes(hoveredKanji)) {
              baseColor = "#ffffff";
              weight = 600;
              highlightSet = new Set([hoveredKanji]);
              highlightColor = EDGE_TYPE_META[nd?.kanjiType.get(hoveredKanji) ?? nd?.primaryType ?? "shared-kanji"].hex;
            } else {
              baseColor = COLORS.muted;
            }
          } else if (hoveredReading) {
            baseColor = isSameReading ? "#ffffff" : COLORS.muted;
            if (isSameReading) weight = 600;
          } else {
            baseColor = COLORS.neighbor;
            highlightSet = new Set(via);
            highlightColor = EDGE_TYPE_META[nd?.primaryType ?? "shared-kanji"].hex;
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
          highlightSet,
          highlightColor,
        );
      }}
      nodePointerAreaPaint={(node, color, ctx) => {
        const n = node as WordNode;
        const isFocus = focused?.id === n.id;
        const isNeighbor = neighbors.has(n.id);
        if (focused && !isFocus && !isNeighbor) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, 14, 0, Math.PI * 2);
        ctx.fill();
      }}
      // ----- edges -----
      linkColor={(link) => {
        const l = link as Edge;
        if (!edgeVisibility[l.type]) return COLORS.edgeHidden;
        const s = endpointId(l.source);
        const t = endpointId(l.target);
        const palette = EDGE_TYPE_META[l.type];
        if (focused) {
          if (s !== focused.id && t !== focused.id) return COLORS.edgeHidden;
          if (hoveredKanji) {
            if (l.type === "same-reading" || !l.via.includes(hoveredKanji)) return palette.muted;
          }
          if (hoveredReading) {
            if (l.type !== "same-reading") return palette.muted;
          }
          return palette.active;
        }
        if (!hovered) return palette.ambient;
        return s === hovered.id || t === hovered.id ? palette.active : COLORS.edgeHidden;
      }}
      linkWidth={(link) => {
        const l = link as Edge;
        if (!edgeVisibility[l.type]) return 0;
        const s = endpointId(l.source);
        const t = endpointId(l.target);
        if (focused) {
          if (s !== focused.id && t !== focused.id) return 0;
          if (hoveredKanji && (l.type === "same-reading" || !l.via.includes(hoveredKanji))) return 0.5;
          if (hoveredReading && l.type !== "same-reading") return 0.5;
          return 1.6;
        }
        if (!hovered) return 0.4;
        return s === hovered.id || t === hovered.id ? 1.4 : 0;
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
