import { useLazyQuery } from "@apollo/client/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dagre from "dagre";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  type NodeProps,
  type NodeTypes,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  JOURNEY_GRAPH_QUERY,
  SEARCH_LOCATIONS_QUERY,
} from "../graphql/queries";
import type {
  Query,
  QueryJourneyGraphArgs,
  QuerySearchLocationsArgs,
} from "@generated/generated";

type JourneyGraphResponse = Pick<Query, "journeyGraph">;
type SearchLocationsResponse = Pick<Query, "searchLocations">;
type LocationOption = SearchLocationsResponse["searchLocations"][number];
type JourneyNodeData = {
  label: string;
};

const BASE_NODE_WIDTH = 90;
const BASE_NODE_HEIGHT = 90;
const GEO_CANVAS_WIDTH = 2200 * 2;
const GEO_CANVAS_HEIGHT = 1400 * 2;
const GEO_CANVAS_PADDING = 180;

function JourneyNode({ data }: NodeProps<JourneyNodeData>) {
  return (
    <>
      <Handle id="top" type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle id="right" type="source" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle id="left" type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle id="top-source" type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle id="right-target" type="target" position={Position.Right} style={{ opacity: 0 }} />
      <Handle id="bottom-target" type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle id="left-source" type="source" position={Position.Left} style={{ opacity: 0 }} />
      <span>{data.label}</span>
    </>
  );
}

const journeyNodeTypes: NodeTypes = {
  journeyNode: JourneyNode,
};

function getClosestSide(dx: number, dy: number, isSource: boolean) {
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      return isSource ? "right" : "left";
    }
    return isSource ? "left" : "right";
  }

  if (dy >= 0) {
    return isSource ? "bottom" : "top";
  }
  return isSource ? "top" : "bottom";
}

function getHandleIds(sourceX: number, sourceY: number, targetX: number, targetY: number) {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;

  const sourceSide = getClosestSide(dx, dy, true);
  const targetSide = getClosestSide(dx, dy, false);

  const sourceHandle =
    sourceSide === "top"
      ? "top-source"
      : sourceSide === "right"
        ? "right"
        : sourceSide === "bottom"
          ? "bottom"
          : "left-source";

  const targetHandle =
    targetSide === "top"
      ? "top"
      : targetSide === "right"
        ? "right-target"
        : targetSide === "bottom"
          ? "bottom-target"
          : "left";

  return { sourceHandle, targetHandle };
}

function getNodeScale(nodeCount: number) {
  if (nodeCount > 40) {
    return 0.66;
  }
  if (nodeCount > 25) {
    return 0.75;
  }
  if (nodeCount > 14) {
    return 0.86;
  }
  return 1;
}

function hasGeoData(
  graph: NonNullable<JourneyGraphResponse["journeyGraph"]>,
) {
  if (graph.nodes.length < 2) {
    return false;
  }

  return graph.nodes.every(
    (node) => typeof node.lat === "number" && typeof node.lng === "number",
  );
}

function buildGeoLayout(
  graph: NonNullable<JourneyGraphResponse["journeyGraph"]>,
  routeNodeIds: Set<string>,
  routeEdgeIds: Set<string>,
) {
  const nodeScale = getNodeScale(graph.nodes.length);
  const nodeWidth = BASE_NODE_WIDTH * nodeScale;
  const nodeHeight = BASE_NODE_HEIGHT * nodeScale;
  const width = GEO_CANVAS_WIDTH;
  const height = GEO_CANVAS_HEIGHT;
  const padding = GEO_CANVAS_PADDING;

  const lats = graph.nodes
    .map((node) => node.lat)
    .filter((lat): lat is number => typeof lat === "number");
  const lngs = graph.nodes
    .map((node) => node.lng)
    .filter((lng): lng is number => typeof lng === "number");

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;

  if (latRange === 0 || lngRange === 0) {
    return null;
  }

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const nodes: Node<JourneyNodeData>[] = graph.nodes.map((node) => {
    const normalizedX = ((node.lng as number) - minLng) / lngRange;
    const normalizedY = (maxLat - (node.lat as number)) / latRange;

    const x = padding + normalizedX * usableWidth;
    const y = padding + normalizedY * usableHeight;
    const isRouteNode = routeNodeIds.has(node.id);

    return {
      id: node.id,
      position: {
        x: x - nodeWidth / 2,
        y: y - nodeHeight / 2,
      },
      data: { label: node.name },
      type: "journeyNode",
      style: {
        borderRadius: 12,
        border: isRouteNode ? "2px solid #ef4444" : "1px solid #bfdbfe",
        background: isRouteNode ? "#fff1f2" : "#f8fbff",
        color: "#0f172a",
        fontWeight: 700,
        fontSize: Math.max(11, Math.round(14 * nodeScale)),
        width: nodeWidth,
        height: nodeHeight,
        display: "grid",
        placeItems: "center",
        padding: "0 6px",
        textAlign: "center",
      },
    };
  });

  const centers = new Map<string, { x: number; y: number }>();
  nodes.forEach((node) => {
    centers.set(node.id, {
      x: node.position.x + nodeWidth / 2,
      y: node.position.y + nodeHeight / 2,
    });
  });

  const edges: Edge[] = graph.edges.map((edge) => {
    const isRouteEdge = routeEdgeIds.has(edge.id);
    const sourceCenter = centers.get(edge.fromId);
    const targetCenter = centers.get(edge.toId);

    const { sourceHandle, targetHandle } = sourceCenter && targetCenter
      ? getHandleIds(sourceCenter.x, sourceCenter.y, targetCenter.x, targetCenter.y)
      : { sourceHandle: undefined, targetHandle: undefined };

    return {
      id: edge.id,
      source: edge.fromId,
      target: edge.toId,
      sourceHandle,
      targetHandle,
      type: "straight",
      label:
        edge.routeName ??
        edge.transportType ??
        `${edge.fromId} -> ${edge.toId}`,
      animated: isRouteEdge,
      style: {
        stroke: isRouteEdge ? "#ef4444" : "#1d4ed8",
        strokeWidth: isRouteEdge ? 3 : 2,
      },
      labelStyle: {
        fill: "#1e293b",
        fontWeight: 600,
        fontSize: 12,
      },
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.88,
        stroke: "#cbd5e1",
        strokeWidth: 1,
        rx: 6,
        ry: 6,
      },
      labelBgPadding: [5, 7],
    };
  });

  return {
    nodes,
    edges,
  };
}

function buildDagreLayout(
  graph: NonNullable<JourneyGraphResponse["journeyGraph"]>,
  routeNodeIds: Set<string>,
  routeEdgeIds: Set<string>,
) {
  const nodeScale = getNodeScale(graph.nodes.length);
  const nodeWidth = BASE_NODE_WIDTH * nodeScale;
  const nodeHeight = BASE_NODE_HEIGHT * nodeScale;
  const layoutGraph = new dagre.graphlib.Graph();
  layoutGraph.setDefaultEdgeLabel(() => ({}));
  layoutGraph.setGraph({
    rankdir: "LR",
    ranksep: Math.max(200, 270 * nodeScale),
    nodesep: Math.max(130, 190 * nodeScale),
    marginx: 120,
    marginy: 100,
  });

  graph.nodes.forEach((node) => {
    layoutGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    });
  });

  graph.edges.forEach((edge) => {
    layoutGraph.setEdge(edge.fromId, edge.toId);
  });

  dagre.layout(layoutGraph);

  const nodes: Node<JourneyNodeData>[] = graph.nodes.map((node) => {
    const positionedNode = layoutGraph.node(node.id);
    const isRouteNode = routeNodeIds.has(node.id);

    return {
      id: node.id,
      position: {
        x: positionedNode.x - nodeWidth / 2,
        y: positionedNode.y - nodeHeight / 2,
      },
      data: { label: node.name },
      type: "journeyNode",
      style: {
        borderRadius: 12,
        border: isRouteNode ? "2px solid #ef4444" : "1px solid #bfdbfe",
        background: isRouteNode ? "#fff1f2" : "#f8fbff",
        color: "#0f172a",
        fontWeight: 700,
        fontSize: Math.max(11, Math.round(14 * nodeScale)),
        width: nodeWidth,
        height: nodeHeight,
        display: "grid",
        placeItems: "center",
        padding: "0 6px",
        textAlign: "center",
      },
    };
  });

  const centers = new Map<string, { x: number; y: number }>();
  nodes.forEach((node) => {
    centers.set(node.id, {
      x: node.position.x + nodeWidth / 2,
      y: node.position.y + nodeHeight / 2,
    });
  });

  const edges: Edge[] = graph.edges.map((edge) => {
    const isRouteEdge = routeEdgeIds.has(edge.id);
    const sourceCenter = centers.get(edge.fromId);
    const targetCenter = centers.get(edge.toId);

    const { sourceHandle, targetHandle } = sourceCenter && targetCenter
      ? getHandleIds(sourceCenter.x, sourceCenter.y, targetCenter.x, targetCenter.y)
      : { sourceHandle: undefined, targetHandle: undefined };

    return {
      id: edge.id,
      source: edge.fromId,
      target: edge.toId,
      sourceHandle,
      targetHandle,
      type: "straight",
      label:
        edge.routeName ??
        edge.transportType ??
        `${edge.fromId} -> ${edge.toId}`,
      animated: isRouteEdge,
      style: {
        stroke: isRouteEdge ? "#ef4444" : "#1d4ed8",
        strokeWidth: isRouteEdge ? 3 : 2,
      },
      labelStyle: {
        fill: "#1e293b",
        fontWeight: 600,
        fontSize: 12,
      },
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.88,
        stroke: "#cbd5e1",
        strokeWidth: 1,
        rx: 6,
        ry: 6,
      },
      labelBgPadding: [5, 7],
    };
  });

  return {
    nodes,
    edges,
  };
}

export default function JourneyPlannerPage() {
  const navigate = useNavigate();
  const [startInput, setStartInput] = useState("Leeds");
  const [endInput, setEndInput] = useState("Manchester");
  const [startId, setStartId] = useState<string | undefined>(undefined);
  const [endId, setEndId] = useState<string | undefined>(undefined);
  const [startOptions, setStartOptions] = useState<LocationOption[]>([]);
  const [endOptions, setEndOptions] = useState<LocationOption[]>([]);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const [searchLocations, { loading: searchingLocations }] = useLazyQuery<
    SearchLocationsResponse,
    QuerySearchLocationsArgs
  >(SEARCH_LOCATIONS_QUERY, {
    fetchPolicy: "network-only",
  });

  const [getJourneyGraph, { data, loading, error }] = useLazyQuery<
    JourneyGraphResponse,
    QueryJourneyGraphArgs
  >(JOURNEY_GRAPH_QUERY, {
    fetchPolicy: "network-only",
  });

  const graph = data?.journeyGraph;

  const fetchLocationOptions = async (query: string) => {
    const cleanedQuery = query.trim();
    if (!cleanedQuery) {
      return [];
    }

    const result = await searchLocations({
      variables: {
        query: cleanedQuery,
      },
    });

    return result.data?.searchLocations ?? [];
  };

  const handleStartChange = async (value: string) => {
    setStartInput(value);
    setStartId(undefined);
    setSelectionError(null);
    setStartOpen(true);

    const options = await fetchLocationOptions(value);
    setStartOptions(options);
  };

  const handleEndChange = async (value: string) => {
    setEndInput(value);
    setEndId(undefined);
    setSelectionError(null);
    setEndOpen(true);

    const options = await fetchLocationOptions(value);
    setEndOptions(options);
  };

  const selectStart = (option: LocationOption) => {
    setStartInput(option.name);
    setStartId(option.id);
    setStartOpen(false);
    setSelectionError(null);
  };

  const selectEnd = (option: LocationOption) => {
    setEndInput(option.name);
    setEndId(option.id);
    setEndOpen(false);
    setSelectionError(null);
  };

  const layout = useMemo(() => {
    if (!graph) {
      return {
        nodes: [],
        edges: [],
      };
    }

    const routeNodeIds = new Set(graph.route.nodes.map((node) => node.id));
    const routeEdgeIds = new Set(graph.route.edges.map((edge) => edge.id));

    if (hasGeoData(graph)) {
      const geoLayout = buildGeoLayout(graph, routeNodeIds, routeEdgeIds);
      if (geoLayout) {
        return geoLayout;
      }
    }

    return buildDagreLayout(graph, routeNodeIds, routeEdgeIds);
  }, [graph]);

  const handleShowGraph = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!startId || !endId) {
      setSelectionError("Please pick both start and end from the dropdown suggestions.");
      return;
    }

    await getJourneyGraph({
      variables: {
        startId,
        endId,
      },
    });
  };

  return (
    <div className="journey-page">
      <div className="journey-controls-panel">
        <div className="journey-header-row">
          <div>
            <h1>Journey Planner</h1>
            <p>Build a route graph between two places using your mock transport network.</p>
          </div>

          <button
            className="secondary-button journey-back-button"
            onClick={() => navigate("/")}
            type="button"
          >
            Back Home
          </button>
        </div>

        <form className="journey-form journey-form-grid" onSubmit={handleShowGraph}>
          <label className="field journey-autocomplete">
            <span>Start</span>
            <input
              type="text"
              value={startInput}
              onChange={(event) => void handleStartChange(event.target.value)}
              onFocus={() => setStartOpen(true)}
              onBlur={() => window.setTimeout(() => setStartOpen(false), 120)}
              placeholder="Leeds"
              required
            />

            {startOpen && startOptions.length > 0 ? (
              <ul className="journey-suggestions" role="listbox" aria-label="Start locations">
                {startOptions.map((option) => (
                  <li key={`start-${option.id}`}>
                    <button
                      type="button"
                      className="journey-suggestion-item"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectStart(option);
                      }}
                    >
                      <span>{option.name}</span>
                      {option.type ? <small>{option.type}</small> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </label>

          <label className="field journey-autocomplete">
            <span>End</span>
            <input
              type="text"
              value={endInput}
              onChange={(event) => void handleEndChange(event.target.value)}
              onFocus={() => setEndOpen(true)}
              onBlur={() => window.setTimeout(() => setEndOpen(false), 120)}
              placeholder="Manchester"
              required
            />

            {endOpen && endOptions.length > 0 ? (
              <ul className="journey-suggestions" role="listbox" aria-label="End locations">
                {endOptions.map((option) => (
                  <li key={`end-${option.id}`}>
                    <button
                      type="button"
                      className="journey-suggestion-item"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectEnd(option);
                      }}
                    >
                      <span>{option.name}</span>
                      {option.type ? <small>{option.type}</small> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </label>

          <button className="primary-button journey-submit-button" type="submit" disabled={loading}>
            {loading ? "Loading graph..." : "Show graph"}
          </button>
        </form>

        {graph ? (
          <p className="journey-meta">
            Showing graph for {graph.start.name} to {graph.end.name}
          </p>
        ) : (
          <p className="journey-meta">
            Search and select both locations from suggestions, then show the graph.
          </p>
        )}

        {searchingLocations ? (
          <p className="journey-meta">Searching locations...</p>
        ) : null}

        {selectionError ? <p className="error-text">{selectionError}</p> : null}

        {graph?.route.totalDuration ? (
          <p className="journey-meta">Estimated route duration: {graph.route.totalDuration} min</p>
        ) : null}

        {error ? <p className="error-text">{error.message}</p> : null}
      </div>

      <div className="journey-graph-stage">
        {graph ? (
          <ReactFlow
            nodes={layout.nodes}
            edges={layout.edges}
            nodeTypes={journeyNodeTypes}
            fitView
            fitViewOptions={{ padding: 0.5, minZoom: 0.18, maxZoom: 1.2 }}
            nodesDraggable
            elementsSelectable
            defaultEdgeOptions={{ zIndex: 2 }}
            minZoom={0.15}
            maxZoom={1.8}
          >
            <MiniMap
              pannable
              zoomable
              style={{
                backgroundColor: "#e2e8f0",
                border: "1px solid #94a3b8",
              }}
            />
            <Background color="#bfdbfe" gap={20} />
            <Controls showInteractive={false} />
          </ReactFlow>
        ) : (
          <div className="journey-empty-state">
            <h2>Graph Canvas</h2>
            <p>Submit the form above to render the journey network.</p>
          </div>
        )}
      </div>
    </div>
  );
}