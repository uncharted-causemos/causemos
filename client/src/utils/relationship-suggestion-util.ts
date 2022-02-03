import projectService from '@/services/project-service';
import { CAGGraph, NodeParameter } from '@/types/CAG';
import { Statement } from '@/types/Statement';
import _ from 'lodash';
import filtersUtil from './filters-util';
import { STATEMENT_POLARITY } from './polarity-util';
import { calcEdgeColor } from './scales-util';

export interface EdgeSuggestion {
  source: string;
  target: string;
  color: string;
  numEvidence: number;
  statements: Statement[];
}

// TODO: give a clearer name and move somewhere more generic? projectService?
export const getStatementsInKB = (
  concepts: string[],
  projectId: string
): Promise<Statement[]> => {
  const searchFilters = filtersUtil.newFilters();
  for (let i = 0; i < concepts.length; i++) {
    filtersUtil.addSearchTerm(searchFilters, 'topic', concepts[i], 'or', false);
  }

  return projectService.getProjectStatements(projectId, searchFilters, {
    size: projectService.STATEMENT_LIMIT
  });
};

const edgeSorter = (a: EdgeSuggestion, b: EdgeSuggestion) =>
  b.numEvidence - a.numEvidence;

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

// TODO: mention output is sorted
export const extractTopEdgesFromStatements = (
  statements: Statement[],
  node: NodeParameter,
  graphData: CAGGraph,
  isLookingForDriverEdges = false
): EdgeSuggestion[] => {
  const concepts = node.components;
  // Filter out the outgoing/incoming edges depending on isLookingForDriverEdges
  const filteredStatements = statements.filter(statement => {
    if (isLookingForDriverEdges) {
      // Only keep edges where the object concept is found in this node's components
      return concepts.includes(statement.obj.concept);
    }
    return concepts.includes(statement.subj.concept);
  });
  // TODO: more detail
  // Map to node-container level if applicable
  // Create a map from the concept to the statements that represent it
  const conceptToStatementsMap = new Map<string, Statement[]>();
  filteredStatements.forEach(statement => {
    // For each statement, find any node containers in the graph that contain
    //  the other concept in this statement
    const otherConcept = isLookingForDriverEdges
      ? statement.subj.concept
      : statement.obj.concept;
    const nodeContainers = graphData.nodes.filter(n =>
      n.components.includes(otherConcept)
    );
    if (nodeContainers.length === 0) {
      // No node containers contain this concept, so it should be used to
      //  represent the statement
      addToMap(conceptToStatementsMap, otherConcept, statement);
    } else {
      // One or more node containers contain this concept
      nodeContainers.forEach(nodeContainer => {
        const otherConcept = nodeContainer.concept;

        // Skip if edge exists in graph and statement exists on edge
        const edgeToLookFor = isLookingForDriverEdges
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
  const edges: EdgeSuggestion[] = mapEntries.map(([key, statements]) => {
    const source = isLookingForDriverEdges ? key : node.concept;
    const target = isLookingForDriverEdges ? node.concept : key;
    return {
      source,
      target,
      color: calcEdgeColor(statementsToEdgeAttributes(statements)),
      numEvidence: _.sumBy(statements, s => s.wm.num_evidence),
      statements
    };
  });
  return edges.sort(edgeSorter);
};
