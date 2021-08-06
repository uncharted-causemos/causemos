export type D3Selection = d3.Selection<HTMLElement, any, null, any>;

export type D3GElementSelection = d3.Selection<SVGGElement, any, null, any>;

export type D3ScaleLinear = d3.ScaleLinear<number, number, never>;
export type D3ScalePoint = d3.ScalePoint<string | number>;
export type D3Scale = D3ScaleLinear | D3ScalePoint;
