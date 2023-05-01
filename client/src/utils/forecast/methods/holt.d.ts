/**
 * An executable Holt function object
 */
export interface HoltFunctionObject<TDatum = [number, number]> {
  (): HoltFunctionObject;

  /**
   * Get or set the initial value for the level
   * @param {number} [value] - The value for the level
   * @returns Either the value for the level or the enclosing object
   */
  initialLevel: <T extends number | undefined = undefined>(
    value?: T
  ) => T extends number ? HoltFunctionObject<TDatum> : number;

  /**
   * Get or set the initial value for the trend
   * @param {number} [value] - The value for the trend
   * @returns Either the value for the trend or the enclosing object
   */
  initialTrend: <T extends number | undefined = undefined>(
    value?: T
  ) => T extends number ? HoltFunctionObject<TDatum> : number;

  /**
   * Define a function to convert the x data passed in to the function. The default function just takes the first number in the arrays of array of data points
   * @param {function} [v] - A function to convert the x data for use in the function
   * @returns The conversion function if no parameter is passed in, otherwise returns the enclosing object.
   */
  x: <T extends (d: TDatum) => number | undefined = undefined>(
    v?: T
  ) => T extends (d: TDatum) => number
    ? HoltFunctionObject<TDatum>
    : (d: TDatum | [number, number]) => number;

  /**
   * Define a function to convert the y data passed in to the function. The default function just takes the second number in the arrays of array of data points
   * @param {function} [v] - A function to convert the y data for use in the function
   * @returns The conversion function if no parameter is passed in, otherwise returns the enclosing object.
   */
  y: <T extends (d: TDatum) => number | undefined = undefined>(
    v?: T
  ) => T extends (d: TDatum) => number
    ? HoltFunctionObject<TDatum>
    : (d: TDatum | [number, number]) => number;

  /**
   * Input the data. The default format is as an array of arrays of x and y values i.e. [['x1','y1']['x2','y2']]
   * @param data - the data
   * @returns The enclosing object
   */
  data: (data: TDatum[]) => HoltFunctionObject<TDatum>;

  /**
   * Define or get the factor to smooth the data by
   * @param {number} [value=0.3] - A number between 0 and 1 to smooth the data by
   * @returns Either the factor or the enclosing object
   */
  factor: <T extends number | undefined = undefined>(
    alpha?: T
  ) => T extends number ? HoltFunctionObject<TDatum> : number;

  /**
   * Provide or get the trend factor
   * @param {number} [beta] - The trend factor
   * @returns If no parameter is passed in then the current trend value. Otherwise it will return the enclosing object.
   */
  trend: <T extends number | undefined = undefined>(
    beta?: T
  ) => T extends number ? HoltFunctionObject<TDatum> : number;

  /**
   * Specify the function to calculate the initial trend value.
   * F1: Initial average difference between first three pairs of points
   * F2: Trend for first to second point
   * F3: Trend between first and last point
   * @param {1 | 2 | 3} [value] - The function to calculate the initial value for the trend. The default is the average difference between the first 3 points
   * @returns If no parameter is provided then the function type is provided otherwise the enclosing object is returned.
   */
  initialTrendCalculation: <T extends (1 | 2 | 3) | undefined = undefined>(
    value?: T
  ) => T extends 1 | 2 | 3 ? HoltFunctionObject<TDatum> : 1 | 2 | 3;

  /**
   * Returns the smoothed data
   * @returns The smoothed data
   */
  output: () => [number, number][];

  /**
   * Returns the residuals
   * @returns The residuals
   */
  residuals: () => number[];

  /**
   * Returns the sum of squares of the residuals
   * @returns The sum of squares of the residuals
   */
  sumSquares: () => number;

  /**
   * Provide a forecast of the function
   * @param {number} [d] - The number of time units to forecast ahead. If the data is monthly then 2 is 2 months.
   * @returns The forecast
   */
  forecast: (d: number) => number;
}

/**
 * Holt's Exponential Smoothing
 * @returns {object} Object containing the forecast points, the residuals, the sum of squares of the residuals and the factor
 */
export function holt<TDatum = [number, number]>(): HoltFunctionObject<TDatum>;
