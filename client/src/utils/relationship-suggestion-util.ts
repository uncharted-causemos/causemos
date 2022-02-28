import { CAGGraph, NodeParameter } from '@/types/CAG';
import { EdgeDirection } from '@/types/Enums';
import { Statement } from '@/types/Statement';
import _ from 'lodash';
import { STATEMENT_POLARITY } from './polarity-util';
import { calcEdgeColor } from './scales-util';

export interface EdgeSuggestion {
  source: string;
  target: string;
  color: string;
  numEvidence: number;
  statements: Statement[];
}

// Extract edge attributes
const statementsToEdgeAttributes = (statements: Statement[]) => {
  const edgeAttributes = statements.reduce(
    (accumulator: any, s) => {
      const wm = s.wm;
      const p = wm.statement_polarity;

      accumulator.belief_score += s.belief;
      accumulator.same += p === STATEMENT_POLARITY.SAME ? 1 : 0;
      accumulator.opposite += p === STATEMENT_POLARITY.OPPOSITE ? 1 : 0;
      accumulator.unknown += p === STATEMENT_POLARITY.UNKNOWN ? 1 : 0;
      return accumulator;
    },
    { same: 0, opposite: 0, unknown: 0, belief_score: 0 }
  );
  edgeAttributes.belief_score = edgeAttributes.belief_score / statements.length;
  return edgeAttributes;
};

const addToMap = (
  map: Map<string, Statement[]>,
  key: string,
  val: Statement
) => {
  if (!map.has(key)) {
    map.set(key, []);
  }
  const entry = map.get(key);
  if (entry === undefined) return;
  entry.push(val);
};

/**
 * Takes a list of statements and calculates either the incoming or outgoing
 * potential edges for a given node.
 */
export const extractEdgesFromStatements = (
  statements: Statement[],
  node: NodeParameter,
  graphData: CAGGraph,
  edgeDirection: EdgeDirection
): EdgeSuggestion[] => {
  const concepts = node.components;
  // Filter out the outgoing/incoming edges depending on edgeDirection
  const filteredStatements = statements.filter(statement => {
    if (edgeDirection === EdgeDirection.Incoming) {
      // Only keep edges where the object concept is found in this node's components
      return concepts.includes(statement.obj.concept);
    }
    return concepts.includes(statement.subj.concept);
  });
  // The graph might already include node containers with multiple concepts.
  // For a given statement, if a node container exists that contains the other
  //  concept in the statement, we want the new edge to use the concept that
  //  represents that node container instead.
  // E.g. if we have a node called "precipitation" that includes "rain" and
  //  "snow", then a statement that has "rain" as the other concept should
  //  instead be assigned to the "precipitation" concept.
  const conceptToStatementsMap = new Map<string, Statement[]>();
  filteredStatements.forEach(statement => {
    // Find any node containers in the graph that contain the other concept
    const otherConcept =
      edgeDirection === EdgeDirection.Incoming
        ? statement.subj.concept
        : statement.obj.concept;
    const nodeContainers = graphData.nodes.filter(n =>
      n.components.includes(otherConcept)
    );
    if (nodeContainers.length === 0) {
      // No node containers contain otherConcept, so it should be used to
      //  represent the statement
      addToMap(conceptToStatementsMap, otherConcept, statement);
    } else {
      // One or more node containers contain this concept
      nodeContainers.forEach(nodeContainer => {
        const otherConcept = nodeContainer.concept;
        // Skip if edge exists in graph and statement exists on edge
        const edgeToLookFor =
          edgeDirection === EdgeDirection.Incoming
            ? { source: otherConcept, target: node.concept }
            : { source: node.concept, target: otherConcept };
        const existingEdge = graphData.edges.find(
          edge =>
            edge.source === edgeToLookFor.source &&
            edge.target === edgeToLookFor.target
        );
        if (
          existingEdge !== undefined &&
          existingEdge.reference_ids.includes(statement.id)
        ) {
          return;
        }
        addToMap(conceptToStatementsMap, otherConcept, statement);
      });
    }
  });
  const mapEntries = [...conceptToStatementsMap.entries()];
  return mapEntries.map(([key, statements]) => ({
    source: edgeDirection === EdgeDirection.Incoming ? key : node.concept,
    target: edgeDirection === EdgeDirection.Incoming ? node.concept : key,
    color: calcEdgeColor(statementsToEdgeAttributes(statements)),
    numEvidence: _.sumBy(statements, s => s.wm.num_evidence),
    statements
  })) as EdgeSuggestion[];
};

export const sortSuggestionsByEvidenceCount = (edges: EdgeSuggestion[]) => {
  return edges.sort((a, b) => b.numEvidence - a.numEvidence);
};

/**
 * For each concept in `concepts`, look for an edge suggestion either coming out
 * of or going into `knownConcept`. If no edge suggestion exists, make one.
 * @param concepts will be mapped to edge suggestions
 * @param edges existing edge suggestions
 * @param knownConcept this concept exists as either the source or target of each edge suggestion
 * @param isTargetConceptKnown determines whether we're looking for incoming/outgoing edges
 * @returns the list of edge suggestions, one for each concept in `concepts`.
 */
export const getEdgesFromConcepts = (
  concepts: string[],
  edges: EdgeSuggestion[],
  knownConcept: string,
  isTargetConceptKnown: boolean
): EdgeSuggestion[] => {
  return concepts.map(concept => {
    const edge = edges.find(edge => {
      return isTargetConceptKnown
        ? edge.source === concept
        : edge.target === concept;
    });
    if (edge !== undefined) {
      return edge;
    }
    return {
      source: isTargetConceptKnown ? concept : knownConcept,
      target: isTargetConceptKnown ? knownConcept : concept,
      color: 'black',
      numEvidence: 0,
      statements: []
    };
  });
};

/**
 * Checks the `graphData` to see which of the suggestions will require new nodes,
 *  which will require new edges, and which will simply need to add evidence to
 *  existing edges.
 */
export const calculateNewNodesAndEdges = (
  selectedSuggestions: {
    source: string;
    target: string;
    reference_ids: string[];
  }[],
  graphData: CAGGraph,
  ontologyFormatter: (concept: string) => string
) => {
  // Calculate if there are new nodes
  const graphNodes = graphData.nodes;
  const newNodes: NodeParameter[] = [];
  selectedSuggestions.forEach(({ source, target }) => {
    // Check source
    if (!_.some(graphNodes, d => d.concept === source)) {
      if (!_.some(newNodes, d => d.concept === source)) {
        newNodes.push({
          id: '',
          concept: source,
          label: ontologyFormatter(source),
          components: [source]
        });
      }
    }
    // Check target
    if (!_.some(graphNodes, d => d.concept === target)) {
      if (!_.some(newNodes, d => d.concept === target)) {
        newNodes.push({
          id: '',
          concept: target,
          label: ontologyFormatter(target),
          components: [target]
        });
      }
    }
  });
  // Combine new edges with existing ones to ensure we don't create duplicates
  const graphEdges = graphData.edges;
  const deduplicatedEdges = selectedSuggestions.map(newEdge => {
    const existingEdge = graphEdges.find(e => {
      return e.source === newEdge.source && e.target === newEdge.target;
    });
    if (existingEdge) {
      return {
        id: existingEdge.id,
        source: existingEdge.source,
        target: existingEdge.target,
        reference_ids: existingEdge.reference_ids.concat(newEdge.reference_ids)
      };
    } else {
      return newEdge;
    }
  });
  return { nodes: newNodes, edges: deduplicatedEdges };
};
