import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { useStore } from "../store";
import { endpointId, type Edge, type EdgeType, type WordNode } from "../types";
import { tween } from "../lib/animation";
import { focusLayout, type NeighborSpec, type XY } from "../lib/layout";
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
  LIGHT_NODE_COLORS,
  EDGE_TYPE_META,
  EDGE_TYPE_PRIORITY,
  hexToRgba,
  FONT_FAMILY,
  COOLDOWN_TICKS,
  D3_ALPHA_DECAY,
  D3_VELOCITY_DECAY,
  NODE_REL_SIZE,
  FOCUS_RING_RADIUS_MULTIPLIER,
  RESIZE_FIT_MS,
  GRAPH_FIT_PADDING,
  EDGE_CURVATURE_STEP,
  FOCUS_NODE_RADIUS,
  FOCUS_SHADOW_BLUR,
  FREQ_DOT_MIN,
  FREQ_DOT_MAX,
  FREQ_LOG_MAX,
} from "../lib/constants";
import { graphRef } from "../lib/graphRef";

type Pos = { id: string; x: number; y: number };

function freqDotR(rank: number): number {
  const normalized = Math.max(0, 1 - Math.log(rank) / Math.log(FREQ_LOG_MAX));
  return FREQ_DOT_MIN + (FREQ_DOT_MAX - FREQ_DOT_MIN) * Math.pow(normalized, 0.7);
}

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
  const setHovered = useStore((s) => s.setHovered);
  const focused = useStore((s) => s.focused);
  const setFocused = useStore((s) => s.setFocused);
  const hoveredKanji = useStore((s) => s.hoveredKanji);
  const hoveredReading = useStore((s) => s.hoveredReading);
  const setTransitioning = useStore((s) => s.setTransitioning);
  const edgeVisibility = useStore((s) => s.settings.edgeVisibility);
  const settings = useStore((s) => s.settings);
  // hoveredId subscription triggers a Graph re-render on hover enter/leave, which
  // creates new linkColor/linkWidth function objects. The force-graph library calls
  // notifyRedraw when these props change, setting needsRedraw=true so the canvas
  // repaints even after the simulation has stopped (autoPauseRedraw=true default).
  const hoveredId = useStore((s) => s.hovered?.id ?? null);

  const theme = useStore((s) => s.settings.theme);
  const COLORS = theme === "light" ? LIGHT_NODE_COLORS : NODE_COLORS;

  // Hover state in refs for nodeCanvasObject, which is called per-frame by the
  // canvas loop and doesn't need a React re-render to read live values.
  const hoveredRef = useRef<WordNode | null>(null);
  const hoverNeighborsRef = useRef<Set<string>>(new Set());

  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const cancelTweenRef = useRef<(() => void) | null>(null);
  const cachedPositionsRef = useRef<Map<string, XY>>(new Map());
  const cameraSnapshotRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ w: number; h: number }>(() => ({
    w: typeof window === "undefined" ? 0 : window.innerWidth,
    h: typeof window === "undefined" ? 0 : window.innerHeight,
  }));

  // Track wrapper size + devicePixelRatio. ForceGraph2D's internal ResizeSensor
  // doesn't fire on browser-zoom changes (DPR shifts but layout dims don't), so
  // the canvas backing store stays at the old DPR and points get drawn at the
  // wrong coords. We watch DPR via matchMedia and nudge the dims by 1px to
  // force ForceGraph2D to re-allocate the canvas at the new DPR.
  useEffect(() => {
    const update = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      setDims((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    update();
    const ro = new ResizeObserver(update);
    if (wrapperRef.current) ro.observe(wrapperRef.current);

    let mql: MediaQueryList | null = null;
    let onDprChange: (() => void) | null = null;
    const watchDpr = () => {
      mql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      onDprChange = () => {
        mql?.removeEventListener("change", onDprChange!);
        const el = wrapperRef.current;
        if (el) {
          const w = el.clientWidth;
          const h = el.clientHeight;
          // Nudge then restore — forces ForceGraph2D to re-measure the canvas.
          setDims({ w: w - 1, h });
          requestAnimationFrame(() => {
            setDims({ w, h });
            requestAnimationFrame(() => {
              (fgRef.current as unknown as { refresh?: () => void } | undefined)?.refresh?.();
            });
          });
        }
        watchDpr();
      };
      mql.addEventListener("change", onDprChange);
    };
    watchDpr();

    return () => {
      ro.disconnect();
      if (mql && onDprChange) mql.removeEventListener("change", onDprChange);
    };
  }, []);

  // Repaint canvas when theme changes. The simulation's RAF loop may have
  // stopped, leaving the canvas frozen at the old background colour.
  // setTimeout(0) defers past the React commit so fgRef holds the updated
  // ForceGraph2D instance and its internal backgroundColor has been set.
  useEffect(() => {
    const id = setTimeout(() => {
      const fg = fgRef.current;
      if (!fg) return;
      // pauseAnimation/resumeAnimation are public API and restart the RAF loop,
      // which repaints the canvas with the current backgroundColor prop.
      fg.pauseAnimation();
      fg.resumeAnimation();
    }, 0);
    return () => clearTimeout(id);
  }, [theme]);

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

  // Curvature for parallel edges (same word-pair, different type) so they don't overlap.
  const edgeCurvature = useMemo(() => {
    const pairMap = new Map<string, Edge[]>();
    for (const e of graph.edges as Edge[]) {
      const s = endpointId(e.source);
      const t = endpointId(e.target);
      const key = s < t ? `${s}|${t}` : `${t}|${s}`;
      if (!pairMap.has(key)) pairMap.set(key, []);
      pairMap.get(key)!.push(e);
    }
    const curvMap = new Map<Edge, number>();
    for (const edges of pairMap.values()) {
      if (edges.length === 1) {
        curvMap.set(edges[0], 0);
      } else {
        const sorted = [...edges].sort(
          (a, b) => EDGE_TYPE_PRIORITY.indexOf(a.type) - EDGE_TYPE_PRIORITY.indexOf(b.type)
        );
        const step = EDGE_CURVATURE_STEP;
        const start = -((sorted.length - 1) * step) / 2;
        sorted.forEach((e, i) => curvMap.set(e, start + i * step));
      }
    }
    return curvMap;
  }, [graph.edges]);

  // Adjacency index keyed by edge type, built once per graph load.
  // Replaces O(E) edge scans in neighbors, onNodeHover, and the focus tween.
  const adjByType = useMemo(() => {
    const maps = new Map<EdgeType, Map<string, Set<string>>>();
    for (const e of graph.edges as Edge[]) {
      const s = endpointId(e.source);
      const t = endpointId(e.target);
      let m = maps.get(e.type);
      if (!m) { m = new Map(); maps.set(e.type, m); }
      if (!m.has(s)) m.set(s, new Set());
      if (!m.has(t)) m.set(t, new Set());
      m.get(s)!.add(t);
      m.get(t)!.add(s);
    }
    return maps;
  }, [graph]);

  // Focus-mode neighbors (hover-mode neighbors live in hoverNeighborsRef).
  const neighbors = useMemo(() => {
    if (!focused) return new Set<string>();
    const out = new Set<string>();
    for (const [type, m] of adjByType) {
      if (!edgeVisibility[type]) continue;
      const nbrs = m.get(focused.id);
      if (nbrs) for (const id of nbrs) out.add(id);
    }
    return out;
  }, [focused, adjByType, edgeVisibility]);

  // For each neighbor of focused: bridging kanji + which edge type contributed each.
  const neighborData = useMemo(() => {
    // similarKanjiMap: maps focused-word kanji -> neighbor-word kanji for similar-kanji edges
    type NData = { via: string[]; kanjiType: Map<string, Edge["type"]>; primaryType: Edge["type"]; types: Edge["type"][]; similarKanjiMap: Map<string, string> };
    const map = new Map<string, { viaSet: Set<string>; kanjiType: Map<string, Edge["type"]>; types: Edge["type"][]; similarPairs: Map<string, string> }>();
    if (!focused) return new Map<string, NData>();
    for (const e of graph.edges as Edge[]) {
      if (!edgeVisibility[e.type]) continue;
      const s = endpointId(e.source);
      const t = endpointId(e.target);
      if (s !== focused.id && t !== focused.id) continue;
      const other = s === focused.id ? t : s;
      const d = map.get(other) ?? { viaSet: new Set(), kanjiType: new Map(), types: [] as Edge["type"][], similarPairs: new Map() };
      d.types.push(e.type);
      if (e.type !== "same-reading") {
        for (const k of e.via) {
          d.viaSet.add(k);
          if (!d.kanjiType.has(k)) d.kanjiType.set(k, e.type);
        }
        if (e.type === "similar-kanji") {
          const focusedK = e.via.find((k) => focused.kanji.includes(k));
          const neighborK = e.via.find((k) => !focused.kanji.includes(k));
          if (focusedK && neighborK) d.similarPairs.set(focusedK, neighborK);
        }
      }
      map.set(other, d);
    }
    const result = new Map<string, NData>();
    for (const [id, d] of map) {
      const primaryType = EDGE_TYPE_PRIORITY.find((t) => d.types.includes(t)) ?? d.types[0];
      result.set(id, { via: [...d.viaSet], kanjiType: d.kanjiType, primaryType, types: d.types, similarKanjiMap: d.similarPairs });
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
        const center = fg.centerAt();
        cameraSnapshotRef.current = { x: center.x, y: center.y, zoom: fg.zoom() };
      }

      const focusNode = nodes.find((n) => n.id === focused.id);
      if (!focusNode) return;

      const focusNeighbors = new Set<string>();
      for (const [, m] of adjByType) {
        const nbrs = m.get(focused.id);
        if (nbrs) for (const id of nbrs) focusNeighbors.add(id);
      }
      const neighborNodes = nodes.filter((n) => focusNeighbors.has(n.id));
      const neighborSpecs: NeighborSpec[] = neighborNodes.map((n) => ({
        id: n.id,
        x: n.x ?? 0,
        y: n.y ?? 0,
      }));
      const radial = focusLayout(
        { x: focusNode.x ?? 0, y: focusNode.y ?? 0 },
        neighborSpecs,
        neighborRadius,
      );

      const targets = new Map<string, XY>();
      targets.set(focused.id, { x: focusNode.x ?? 0, y: focusNode.y ?? 0 });
      for (const [id, pos] of radial) targets.set(id, pos);

      // Capture start positions and immediately pin every node at its current
      // position. This freezes the simulation for the duration of the tween so
      // an actively-running simulation (e.g. on cold page load) can't fight it.
      const starts = new Map<string, XY>();
      for (const n of nodes) {
        const x = n.fx ?? n.x ?? 0;
        const y = n.fy ?? n.y ?? 0;
        starts.set(n.id, { x, y });
        n.x = x; n.y = y;
        n.fx = x; n.fy = y;
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
            const x = start.x + (target.x - start.x) * t;
            const y = start.y + (target.y - start.y) * t;
            n.x = n.fx = x;
            n.y = n.fy = y;
          }
          (fg as unknown as { refresh?: () => void }).refresh?.();
        },
        onComplete: () => {
          for (const n of nodes) {
            const target = targets.get(n.id);
            if (target) {
              n.x = n.fx = target.x;
              n.y = n.fy = target.y;
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
      const snap = cameraSnapshotRef.current;
      if (snap) {
        fg.centerAt(snap.x, snap.y, transitionMs);
        fg.zoom(snap.zoom, transitionMs);
      } else {
        fg.zoomToFit(transitionMs, GRAPH_FIT_PADDING);
      }

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
          cameraSnapshotRef.current = null;
          setTransitioning(false);
        },
      });
    }

    return () => {
      cancelTweenRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused?.id]);

  // Publish a getter so FocusOverlay can anchor to the focused node's
  // live canvas position each frame. Graph.tsx owns fgRef and the live data
  // node objects; FocusOverlay reads via the store.
  useEffect(() => {
    type Conv = (x: number, y: number) => { x: number; y: number } | undefined;
    const getter = () => {
      const fg = fgRef.current;
      const f = useStore.getState().focused;
      if (!fg || !f) return null;
      const node = (data.nodes as WordNode[]).find((n) => n.id === f.id);
      if (!node || node.x == null || node.y == null) return null;
      const conv = (fg as unknown as { graph2ScreenCoords?: Conv }).graph2ScreenCoords;
      if (!conv) return null;
      const p = conv(node.x, node.y);
      return p ? { x: p.x, y: p.y } : null;
    };
    graphRef.getFocusScreenPos = getter;
    return () => { graphRef.getFocusScreenPos = null; };
  }, [data]);

  useEffect(() => {
    const reset = () => {
      const fg = fgRef.current;
      if (!fg) return;
      const { focused, settings } = useStore.getState();
      const transitionMs = ANIMATION_MS[settings.animationSpeed];
      if (focused) {
        const node = (data.nodes as WordNode[]).find((n) => n.id === focused.id);
        if (!node || node.x == null || node.y == null) return;
        fg.centerAt(node.x, node.y, transitionMs);
        fg.zoom(FOCUS_ZOOM_VALUES[settings.focusZoom], transitionMs);
      } else {
        fg.zoomToFit(transitionMs, GRAPH_FIT_PADDING);
      }
    };
    graphRef.resetZoom = reset;
    return () => { graphRef.resetZoom = null; };
  }, [data]);

  // Deep-link focus on page load. App.tsx captures the initial #word=
  // hash into pendingFocusWord. We only apply it when the layout is settled:
  //   - warm cache: data.nodes already have x/y from localStorage → fire from
  //     the [data] effect immediately, before the simulation perturbs them.
  //   - cold load: wait for onEngineStop so neighbor positions are settled
  //     before the radial tween kicks in.
  // (Earlier we tried onEngineTick + a non-zero threshold; that fired on
  // tick 1 when nodes had only their phyllotaxis seed positions, so the
  // radial tween started from a stale layout — neighbors looked like they
  // never moved.)
  const tryApplyPendingFocus = () => {
    const pending = useStore.getState().pendingFocusWord;
    if (!pending) return;
    const nodes = data.nodes as WordNode[];
    const node = nodes.find((n) => n.word === pending);
    if (!node) {
      useStore.getState().setPendingFocusWord(null);
      return;
    }
    // Require every node to have a valid position; otherwise the radial
    // layout will read undefined neighbors and pile them on one angle.
    const allReady = nodes.every((n) => n.x != null && n.y != null);
    if (!allReady) return;
    useStore.getState().setPendingFocusWord(null);
    setFocused(node);
  };

  useEffect(() => {
    tryApplyPendingFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Resize: refit only in graph view.
  useEffect(() => {
    const handle = () => {
      if (!focused) fgRef.current?.zoomToFit(RESIZE_FIT_MS, GRAPH_FIT_PADDING);
    };
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, [focused]);

  return (
    <div ref={wrapperRef} className="absolute inset-0">
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

        if (focused && !isFocus && !isNeighbor) return; // hide non-relevant

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
          const isSameReading = nd?.types.includes("same-reading") ?? false;
          const dimByKanji = !!hoveredKanji && !via.includes(hoveredKanji);
          const dimByReading = hoveredReading && !isSameReading;
          const dotColor = hoveredKanji
            ? settings.edgeColors[nd?.kanjiType.get(hoveredKanji) ?? nd?.primaryType ?? "shared-kanji"]
            : hoveredReading
              ? settings.edgeColors["same-reading"]
              : settings.edgeColors[nd?.primaryType ?? "shared-kanji"];
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
          ctx.strokeStyle = COLORS.focusRing;
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
              baseColor = COLORS.highlight;
              weight = 600;
              // For similar-kanji edges the bridging char in the neighbor's label is
              // the partner kanji (K2), not the hovered kanji (K1) from the focused word.
              const edgeType = nd?.kanjiType.get(hoveredKanji) ?? nd?.primaryType ?? "shared-kanji";
              const labelKanji = edgeType === "similar-kanji"
                ? (nd?.similarKanjiMap.get(hoveredKanji) ?? hoveredKanji)
                : hoveredKanji;
              highlightSet = new Set([labelKanji]);
              highlightColor = settings.edgeColors[edgeType];
            } else {
              baseColor = COLORS.muted;
            }
          } else if (hoveredReading) {
            baseColor = isSameReading ? COLORS.highlight : COLORS.muted;
            if (isSameReading) weight = 600;
          } else {
            baseColor = COLORS.neighbor;
            highlightSet = new Set(via);
            highlightColor = settings.edgeColors[nd?.primaryType ?? "shared-kanji"];
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
      linkColor={(link) => {
        const l = link as Edge;
        if (!edgeVisibility[l.type]) return COLORS.edgeHidden;
        const s = endpointId(l.source);
        const t = endpointId(l.target);
        const hex = settings.edgeColors[l.type] ?? EDGE_TYPE_META[l.type].hex;
        if (focused) {
          if (s !== focused.id && t !== focused.id) return COLORS.edgeHidden;
          if (hoveredKanji) {
            if (l.type === "same-reading" || !l.via.includes(hoveredKanji)) return hexToRgba(hex, 0.18);
          }
          if (hoveredReading) {
            if (l.type !== "same-reading") return hexToRgba(hex, 0.18);
          }
          return hexToRgba(hex, 0.85);
        }
        if (!hoveredId) return hexToRgba(hex, 0.05);
        return s === hoveredId || t === hoveredId ? hexToRgba(hex, 0.85) : COLORS.edgeHidden;
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
        if (!hoveredId) return 0.4;
        return s === hoveredId || t === hoveredId ? 1.4 : 0;
      }}
      linkCurvature={(link) => edgeCurvature.get(link as Edge) ?? 0}
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
    </div>
  );
}
