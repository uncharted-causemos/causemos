import * as d3 from 'd3';
import { NodeParameter, EdgeParameter } from '@/types/CAG';
import { DeltaRenderer, IEdge, INode } from 'svg-flowgraph2';

type D3SelectionINode<T> = d3.Selection<d3.BaseType, INode<T>, null, any>;
type D3SelectionIEdge<T> = d3.Selection<d3.BaseType, IEdge<T>, null, any>;

export class QualitativeRenderer extends DeltaRenderer<NodeParameter, EdgeParameter> {
  constructor(options: any) {
    super(options);
    console.log('qualitative constructor');
  }

  renderNodesAdded(selection: D3SelectionINode<NodeParameter>) {
    console.log(selection);
  }

  renderNodesUpdated(selection: D3SelectionINode<NodeParameter>) {
    console.log(selection);
  }

  renderNodesRemoved(selection: D3SelectionINode<NodeParameter>) {
    console.log(selection);
  }

  renderEdgesAdded(selection: D3SelectionIEdge<EdgeParameter>) {
    console.log(selection);
  }

  renderEdgesUpdated(selection: D3SelectionIEdge<EdgeParameter>) {
    console.log(selection);
  }

  renderEdgesRemoved(selection: D3SelectionIEdge<EdgeParameter>) {
    console.log(selection);
  }
}
