import $ from 'jquery';
import _ from 'lodash';
import cytoscape from 'cytoscape';
import MouseTrap from 'mousetrap';

import coseBilkent from 'cytoscape-cose-bilkent';
import cxtmenu from 'cytoscape-cxtmenu';
import cola from 'cytoscape-cola';
import expandCollapse from 'cytoscape-expand-collapse';

import GraphRenderer from '@/graphs/cytoscape/graph-renderer';
import CytoscapeData from '@/graphs/cytoscape/cytoscape-data';
import { WM_SEPT2019 } from '@/graphs/cytoscape/cytoscape-styles';

cytoscape.use(coseBilkent);
cytoscape.use(cola);
cxtmenu(cytoscape);
expandCollapse(cytoscape, $);

const _epoch = () => new Date().getTime();

const expandCollapseDefaults = Object.freeze({
  layoutBy: null, // to rearrange after expand/collapse. It's just layout options or whole layout function. Choose your side!
  // recommended usage: use cose-bilkent layout with randomize: false to preserve mental map upon expand/collapse
  fisheye: false, // whether to perform fisheye view after expand/collapse you can specify a function too
  animate: false, // whether to animate on drawing changes you can specify a function too
  ready: function () {}, // callback when expand/collapse initialized
  undoable: false, // and if undoRedoExtension exists,
  cueEnabled: false, // Whether cues are enabled
  expandCollapseCuePosition: 'top-left', // default cue position is top left you can specify a function per node too
  expandCollapseCueSize: 12, // size of expand-collapse cue
  expandCollapseCueLineSize: 8, // size of lines used for drawing plus-minus icons
  expandCueImage: undefined, // image of expand icon if undefined draw regular expand cue
  collapseCueImage: undefined, // image of collapse icon if undefined draw regular collapse cue
  expandCollapseCueSensitivity: 1, // sensitivity of expand-collapse cues
});

export default class CytoscapeGraphRenderer extends GraphRenderer {
  /**
   * @param {object} options - configurations
   * @param {array} options.styles - cytoscape styles definition array
   * @param {boolean} options.ctrlInteractions - use control+zoom and ctrl+pan instead of defaults
   */
  constructor(options) {
    super();
    this.options = options || {};
    this.queue = [];
    this.remaining = 0;
    this.depth = 1000;

    this.postRenderFn = null; // A function to run after all stages have finished

    // Plugin instances
    this.cyContextMenu = null;
  }

  // Tear down
  destroy() {
    if (this.cyContextMenu) {
      this.cyContextMenu.destroy();
    }
  }

  initialize(element) {
    const registry = this.registry;
    const options = this.options;

    // Defaults
    options.styles = options.styles || WM_SEPT2019;
    options.ctrlInteractions = !!options.ctrlInteractions;

    const cy = cytoscape({
      container: element,
      elements: [],
      boxSelectionEnabled: false,
    });
    this.cy = cy;
    this.cy.expandCollapse(expandCollapseDefaults);

    if (options.ctrlInteractions === true) {
      MouseTrap.bind('ctrl', () => {
        cy.zoomingEnabled(true);
        cy.userZoomingEnabled(true);
        cy.panningEnabled(true);
        cy.userPanningEnabled(true);
      });

      MouseTrap.bind(
        'ctrl',
        () => {
          cy.zoomingEnabled(false);
          cy.userZoomingEnabled(false);
          cy.panningEnabled(false);
          cy.userPanningEnabled(false);
        },
        'keyup'
      );
    }

    const makeContextMenu = (menuItems) => {
      return menuItems.map((menuItem) => {
        return {
          content: menuItem.content,
          contentStyle: menuItem.contentStyle,
          select: (element) => {
            return menuItem.select(element, this);
          },
        };
      });
    };

    // const contentStyle = {
    //   'font-size': '12px'
    // };

    // const api = cy.expandCollapse('get');
    // Disable expand/collapse for now because of edge calcultion issues Nov 2019
    // const collapseItem = {
    //   content: 'Collapse',
    //   select: (element) => {
    //     api.collapseRecursively(element);
    //   },
    //   contentStyle
    // };
    // const expandItem = {
    //   content: 'Expand',
    //   select: (element) => {
    //     api.expandRecursively(element);
    //   },
    //   contentStyle
    // };

    this.cyContextMenu = cy.cxtmenu({
      menuRadius: 100,
      selector: 'node',
      commands: (node) => {
        let menuItems = [];
        // if (api.isCollapsible(node)) {
        //   menuItems.push(collapseItem);
        // } else if (api.isExpandable(node)) {
        //   menuItems.push(expandItem);
        // }
        if (node.data().count > 0 && options.contextMenu) {
          menuItems = menuItems.concat(options.contextMenu.nodes);
        }
        return makeContextMenu(menuItems);
      },
    });

    cy.batch(() => {
      cy.setStyle(options.styles);
    });

    // Background click
    cy.on('tap', (e) => {
      if (e.target === cy) {
        if ({}.hasOwnProperty.call(registry, 'backgroundClick')) {
          registry.backgroundClick(e, this);
        }
      }
    });

    cy.on('click', 'node[count > 0]', (e) => {
      if ({}.hasOwnProperty.call(registry, 'nodeClick')) {
        registry.nodeClick(e, this);
      }
    });

    cy.on('box', 'node[count > 0]', (e) => {
      if ({}.hasOwnProperty.call(registry, 'nodeClick')) {
        registry.nodeClick(e, this);
      }
    });

    cy.on('click', 'edge', (e) => {
      if ({}.hasOwnProperty.call(registry, 'edgeClick')) {
        registry.edgeClick(e, this);
      }
    });

    cy.on('layoutstop', () => {
      const currentStage = this.queue[this.layoutIndex];
      if (currentStage.postLayout) {
        currentStage.postLayout(currentStage.selection, this.cache, this.cy);
      }
      currentStage.end = _epoch();
      this.layoutIndex++;
      this._nextStage();
    });
  }

  _nextStage() {
    const cy = this.cy;
    const options = this.options;

    if (this.layoutIndex < this.queue.length) {
      if (options.ctrlInteractions === true) {
        cy.zoomingEnabled(true);
        cy.userZoomingEnabled(true);
        cy.panningEnabled(true);
        cy.userPanningEnabled(true);
      }

      const stage = this.queue[this.layoutIndex];
      if (stage.layout) {
        stage.start = _epoch();
        stage.layout.run();
      } else {
        stage.start = 0;
        stage.end = 0;
        if (stage.postLayout) {
          stage.postLayout(stage.selection, this.cache, this.cy);
        }
        this.layoutIndex++;
        this._nextStage();
      }
    } else {
      if (options.ctrlInteractions === true) {
        cy.zoomingEnabled(false);
        cy.userZoomingEnabled(false);
        cy.panningEnabled(false);
        cy.userPanningEnabled(false);
      }

      console.log('');
      console.log('Layout statistics');
      for (let i = 0; i < this.queue.length; i++) {
        const stage = this.queue[i];
        console.log(`\t${stage.id} ${stage.end - stage.start}`);
      }
      console.log('Layout Done');

      if (!_.isNil(this.postRenderFn)) {
        this.postRenderFn();
      }
    }
  }

  /**
   * Set the depth level from the root.
   *
   * eg: given a/b/c/d where a is the root
   *   depth=0 => a/b/c/d, a/b/c, a/b, a
   *   depth=1 => a/b/cd, a/b/c, a/b
   *   depth=2 => a/b/c/d, a/b/c
   *
   * @param {number} depth
   */
  setDepth(depth) {
    this.depth = depth;
    if (!_.isEmpty(this.data)) {
      this._calculate();
    }
  }

  setData(data) {
    this.cy.elements().remove();
    this.data = data;
    this._calculate();
  }

  /**
   * A strategy composed simulates an ETL progression and has the following steps
   * - @param extract {function | array}
   */
  _calculate() {
    const cy = this.cy;
    const data = this.data;
    const options = this.options;
    const nodes = CytoscapeData.createNodes(data.nodes, this.depth, options.formatter);
    const edges = CytoscapeData.createEdges(data.edges);

    // To be rendered in layout
    cy.batch(() => {
      cy.add(nodes);
      cy.add(edges);
    });

    this.queue = [];
    this.cache = {};

    const cache = this.cache;
    this.strategy.forEach((s) => {
      const selection = s.extract(cache, cy);
      // cache[s.id] = selection;

      this.queue.push({
        id: s.id,
        selection,
        layout: selection.layout(s.layout(selection, cache, cy)),
        postLayout: s.postLayout,
      });
    });
  }

  render(postRenderFn) {
    this.layoutIndex = 0;
    this.postRenderFn = postRenderFn;
    this._nextStage();
  }

  removeAll() {
    const cy = this.cy;
    cy.nodes().remove(); // removing nodes implies removing connected edges
  }

  /**
   * Toggles label visibility
   */
  setLabelVisibility(v) {
    const cy = this.cy;
    const nodes = cy.nodes(':childless');
    cy.batch(() => {
      if (v === true) {
        nodes.removeClass('hidden-label');
      } else {
        nodes.addClass('hidden-label');
      }
      cy.style().selector('node').update();
    });
  }

  /**
   * Toggle edge visibility
   */
  setEdgeVisibility(v) {
    const cy = this.cy;
    const edges = cy.edges();
    if (v === true) {
      edges.style({ display: null });
    } else {
      edges.style({ display: 'none' });
    }
  }

  /**
   * Set edge opacity
   */
  setEdgeOpacity(v) {
    const cy = this.cy;
    cy.edges().style({ opacity: v });
  }
}
