import { useEffect, useRef } from 'react';
import cytoscape, { type Core, type ElementDefinition, type StylesheetJson } from 'cytoscape';

export interface GraphNode {
  id: string;
  label: string;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  dashedBorder?: boolean;
  textColor?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  dashed?: boolean;
}

export interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout?: 'breadthfirst' | 'cose' | 'circle' | 'grid';
  onNodeClick?: (id: string) => void;
  focusNodeId?: string | null;
  height?: number | string;
}

const baseStylesheet: StylesheetJson = [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'border-color': 'data(borderColor)',
      'border-width': 'data(borderWidth)',
      label: 'data(label)',
      color: 'data(textColor)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': 11,
      width: 70,
      height: 40,
      shape: 'round-rectangle',
      'text-wrap': 'wrap',
      'text-max-width': '60px',
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1.5,
      'line-color': '#888',
      'target-arrow-color': '#888',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      label: 'data(label)',
      'font-size': 9,
      color: '#555',
      'text-background-color': '#fff',
      'text-background-opacity': 0.8,
      'text-background-padding': '2px',
    },
  },
  {
    selector: 'edge[?dashed]',
    style: {
      'line-style': 'dashed',
    },
  },
  {
    selector: 'node[?dashedBorder]',
    style: {
      'border-style': 'dashed',
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-color': '#1d4ed8',
      'border-width': 3,
    },
  },
];

const GraphView = ({
  nodes,
  edges,
  layout = 'breadthfirst',
  onNodeClick,
  focusNodeId,
  height = 500,
}: GraphViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const elements: ElementDefinition[] = [
      ...nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          color: n.color ?? '#e5e7eb',
          borderColor: n.borderColor ?? '#374151',
          borderWidth: n.borderWidth ?? 1,
          dashedBorder: n.dashedBorder ? 1 : 0,
          textColor: n.textColor ?? '#111',
        },
      })),
      ...edges.map((e) => ({
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label ?? '',
          dashed: e.dashed ? 1 : 0,
        },
      })),
    ];
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: baseStylesheet,
      layout: { name: layout, fit: true, padding: 20 },
    });
    if (onNodeClick) {
      cy.on('tap', 'node', (evt) => onNodeClick(evt.target.id() as string));
    }
    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, edges, layout, onNodeClick]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !focusNodeId) return;
    const n = cy.getElementById(focusNodeId);
    if (n.nonempty()) {
      cy.elements().unselect();
      n.select();
      cy.animate({ center: { eles: n }, zoom: 1.2 }, { duration: 300 });
    }
  }, [focusNodeId]);

  return <div ref={containerRef} style={{ width: '100%', height }} className="graph-view" />;
};

export default GraphView;
