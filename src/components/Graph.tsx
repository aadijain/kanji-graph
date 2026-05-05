import { useEffect, useMemo, useRef } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { useStore } from "../store";
import { endpointId, type Edge, type WordNode } from "../types";
import { tween } from "../lib/animation";
import { radialAround, type XY } from "../lib/layout";

const LAYOUT_KEY = "kanji-graph:layout:v1";
const RADIUS_NEIGHBOR = 90;
const TRANSITION_MS = 700;
const FOCUS_ZOOM = 3.5;

type Pos = { id: string; x: number; y: number };

function loadLayout(): Map<string, Pos> {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
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
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(arr));
}

const COLORS = {
  nodeDefault: "#e8dccd",
  nodeNeighbor: "#f3e7d3",
  nodeFocus: "#ffffff",
  nodeMuted: "#5a6078",
  edgeActive: "rgba(212, 168, 87, 0.85)",
  edgeMuted: "rgba(212, 168, 87, 0.18)",
  edgeAmbient: "rgba(212, 168, 87, 0.05)",
  edgeHidden: "rgba(0, 0, 0, 0)",
  bridgeKanji: "#d4a857",
  bridgeKanjiHi: "#ffd47a",
};

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
  ctx.font = `${weight} ${fontSize}px "Noto Sans JP", "Hiragino Sans", sans-serif`;
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
  const setTransitioning = useStore((s) => s.setTransitioning);

  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const cancelTweenRef = useRef<(() => void) | null>(null);
  const cachedPositionsRef = useRef<Map<string, XY>>(new Map());

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
      const s = endpointId(e.source);
      const t = endpointId(e.target);
      if (s === focal.id) out.add(t);
      else if (t === focal.id) out.add(s);
    }
    return out;
  }, [focal, graph.edges]);

  // For each neighbor of focused: which kanji bridge them.
  const viaByNeighbor = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!focused) return map;
    for (const e of graph.edges) {
      const s = endpointId(e.source);
      const t = endpointId(e.target);
      if (s !== focused.id && t !== focused.id) continue;
      const other = s === focused.id ? t : s;
      map.set(other, e.via);
    }
    return map;
  }, [focused, graph.edges]);

  // Smooth transition on focus enter / change / exit.
  useEffect(() => {
    cancelTweenRef.current?.();
    cancelTweenRef.current = null;

    const fg = fgRef.current;
    if (!fg) return;
    const nodes = data.nodes as WordNode[];

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
      const radial = radialAround(focusNode, neighborNodes, RADIUS_NEIGHBOR);

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

      fg.centerAt(focusNode.x ?? 0, focusNode.y ?? 0, TRANSITION_MS);
      fg.zoom(FOCUS_ZOOM, TRANSITION_MS);
      setTransitioning(true);

      cancelTweenRef.current = tween({
        duration: TRANSITION_MS,
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
      fg.zoomToFit(TRANSITION_MS, 80);

      cancelTweenRef.current = tween({
        duration: TRANSITION_MS,
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
      if (!focused) fgRef.current?.zoomToFit(400, 80);
    };
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [focused]);

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={data}
      backgroundColor="#0b0c0f"
      cooldownTicks={300}
      onEngineStop={() => {
        if (!focused) {
          saveLayout(data.nodes as WordNode[]);
          fgRef.current?.zoomToFit(600, 80);
        }
      }}
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.3}
      enablePanInteraction={!focused}
      enableZoomInteraction={!focused}
      onBackgroundClick={() => {
        if (focused) setFocused(null);
      }}
      // ----- nodes -----
      nodeRelSize={4}
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

        const fontSize = 14 / globalScale;
        const dotR = (isFocus ? 5 : isHovered ? 5 : 3.5) / globalScale;

        // dot
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, dotR, 0, Math.PI * 2);
        if (isFocus) {
          ctx.fillStyle = COLORS.nodeFocus;
          ctx.shadowColor = "rgba(255,255,255,0.4)";
          ctx.shadowBlur = 16;
        } else if (focused && isNeighbor) {
          const via = viaByNeighbor.get(n.id) ?? [];
          const dimByKanji = !!hoveredKanji && !via.includes(hoveredKanji);
          ctx.fillStyle = dimByKanji ? COLORS.nodeMuted : COLORS.bridgeKanji;
        } else if (isHovered) {
          ctx.fillStyle = COLORS.bridgeKanjiHi;
        } else if (isHoverNeighbor) {
          ctx.fillStyle = COLORS.bridgeKanji;
        } else if (dimmedByHover) {
          ctx.fillStyle = COLORS.nodeMuted;
        } else {
          ctx.fillStyle = COLORS.nodeDefault;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // soft ring around focus
        if (isFocus) {
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, dotR * 2.4, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth = 1 / globalScale;
          ctx.stroke();
        }

        // label — focus node's label is rendered as HTML overlay instead.
        if (isFocus) return;

        let baseColor = COLORS.nodeDefault;
        let weight = 500;
        let highlightSet: Set<string> | undefined;
        let highlightColor = COLORS.bridgeKanji;

        if (focused && isNeighbor) {
          const via = viaByNeighbor.get(n.id) ?? [];
          if (hoveredKanji) {
            if (via.includes(hoveredKanji)) {
              baseColor = "#ffffff";
              weight = 600;
              highlightSet = new Set([hoveredKanji]);
              highlightColor = COLORS.bridgeKanjiHi;
            } else {
              baseColor = COLORS.nodeMuted;
            }
          } else {
            baseColor = COLORS.nodeNeighbor;
            highlightSet = new Set(via);
            highlightColor = COLORS.bridgeKanji;
          }
        } else if (isHoverNeighbor) {
          baseColor = "#f3e7d3";
        } else if (dimmedByHover) {
          baseColor = COLORS.nodeMuted;
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
        const s = endpointId(l.source);
        const t = endpointId(l.target);
        if (focused) {
          if (s !== focused.id && t !== focused.id) return COLORS.edgeHidden;
          if (hoveredKanji && !l.via.includes(hoveredKanji)) return COLORS.edgeMuted;
          return COLORS.edgeActive;
        }
        if (!hovered) return COLORS.edgeAmbient;
        return s === hovered.id || t === hovered.id ? COLORS.edgeActive : COLORS.edgeHidden;
      }}
      linkWidth={(link) => {
        const l = link as Edge;
        const s = endpointId(l.source);
        const t = endpointId(l.target);
        if (focused) {
          if (s !== focused.id && t !== focused.id) return 0;
          if (hoveredKanji && !l.via.includes(hoveredKanji)) return 0.5;
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
