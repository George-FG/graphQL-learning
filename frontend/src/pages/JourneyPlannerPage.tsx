import { useLazyQuery } from "@apollo/client/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { JOURNEY_GRAPH_QUERY } from "../graphql/queries";
import type { Query, QueryJourneyGraphArgs } from "@generated/generated";

type JourneyGraphResponse = Pick<Query, "journeyGraph">;

export default function JourneyPlannerPage() {
  const navigate = useNavigate();
  const [start, setStart] = useState("Leeds");
  const [end, setEnd] = useState("Manchester");

  const [getJourneyGraph, { data, loading, error }] = useLazyQuery<
    JourneyGraphResponse,
    QueryJourneyGraphArgs
  >(JOURNEY_GRAPH_QUERY, {
    fetchPolicy: "network-only",
  });

  const graph = data?.journeyGraph;

  const nodes = useMemo<Node[]>(() => {
    if (!graph) {
      return [];
    }

    return graph.nodes.map((node, index) => ({
      id: node.id,
      position: { x: 120 + index * 230, y: 160 },
      data: { label: node.name },
    }));
  }, [graph]);

  const edges = useMemo<Edge[]>(() => {
    if (!graph) {
      return [];
    }

    return graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: true,
    }));
  }, [graph]);

  const handleShowGraph = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await getJourneyGraph({
      variables: {
        start,
        end,
      },
    });
  };

  return (
    <div className="page-shell">
      <div className="auth-card journey-card">
        <h1>Journey Planner</h1>
        <p>Enter a start and end location to fetch a mock journey graph.</p>

        <form className="journey-form" onSubmit={handleShowGraph}>
          <label className="field">
            <span>Start</span>
            <input
              type="text"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              placeholder="Leeds"
              required
            />
          </label>

          <label className="field">
            <span>End</span>
            <input
              type="text"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              placeholder="Manchester"
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Loading graph..." : "Show graph"}
          </button>
        </form>

        {graph ? (
          <p className="journey-meta">
            Showing mock network for {graph.start} to {graph.end}
          </p>
        ) : null}

        {error ? <p className="error-text">{error.message}</p> : null}

        <div className="graph-shell">
          {graph ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              nodesDraggable={false}
              elementsSelectable={false}
            >
              <Background />
              <Controls />
            </ReactFlow>
          ) : (
            <p className="empty-state">Click "Show graph" to load the mock graph.</p>
          )}
        </div>

        <button className="secondary-button" onClick={() => navigate("/")}>
          Back Home
        </button>
      </div>
    </div>
  );
}