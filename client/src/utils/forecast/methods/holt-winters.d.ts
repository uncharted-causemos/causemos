/**
 * An executable Holt Winters function object
 */
export interface HoltWintersFunctionObject<TDatum = [number, number]> {
  (): HoltWintersFunctionObject;

  /**
   * Get or set the initial value for the level
   * @param {number} [value] - The value for the level
   * @returns Either the value for the level or the enclosing object
   */
  initialLevel: <T extends number | undefined = undefined>(
    value?: T
  ) => T extends number ? HoltWintersFunctionObject<TDatum> : number;

  /**
   * Get or set the initial value for the trend
   * @param {number} [value] - The value for the trend
   * @returns Either the value for the trend or the enclosing object
   */
  initialTrend: <T extends number | undefined = undefined>(
    value?: T
  ) => T extends number ? HoltWintersFunctionObject<TDatum> : number;

  /**
   * Get or set the initial value for the seasonality
   * @param {number} [value] - The value for the seasonality
   * @returns Either the value for the seasonality or the enclosing object
   */
  initialSeason: <T extends number | undefined = undefined>(
    value?: T
  ) => T extends number ? HoltWintersFunctionObject<TDatum> : number;

  /**
   * Get or set the periodicity of the data set
   * @param {number} [value] - The periodicity
   * @returns Either the periodicity or the enclosing object
   */
  period: <T extends number | undefined = undefined>(
    value?: T
  ) => T extends number ? HoltWintersFunctionObject<TDatum> : number;

  /**
   * Input the data. The default format is as an array of arrays of x and y values i.e. [['x1','y1']['x2','y2']]
   * @param data - the data
   * @returns The enclosing object
   */
  data: (data: TDatum[]) => HoltWintersFunctionObject<TDatum>;

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
   * Returns the smoothed data
   * @returns The smoothed data
   */
  output: () => [number, number][];

  /**
   * Returns the smoothed y points
   * @returns The smoothed y points
   */
  outputY: () => number[];

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
   * Provide or get the level factor
   * @param {number} [alpha] - The level factor
   * @returns If no parameter is passed in then the current level value. Otherwise it will return the enclosing object.
   */
  level: <T extends number | undefined = undefined>(
    alpha?: T
  ) => T extends number ? HoltWintersFunctionObject<TDatum> : number;

  /**
   * Provide or get the trend factor
   * @param {number} [beta] - The trend factor
   * @returns If no parameter is passed in then the current trend value. Otherwise it will return the enclosing object.
   */
  trend: <T extends number | undefined = undefined>(
    beta?: T
  ) => T extends number ? HoltWintersFunctionObject<TDatum> : number;

  /**
   * Provide or get the seasonal factor
   * @param {number} [gamma] - The seasonal factor
   * @returns If no parameter is passed in then the current seasonal value. Otherwise it will return the enclosing object.
   */
  season: <T extends number | undefined = undefined>(
    gamma?: T
  ) => T extends number ? HoltWintersFunctionObject<TDatum> : number;

  /**
   * Provide a forecast of the function
   * @param {number} [d] - The number of time units to forecast ahead. If the data is monthly then 2 is 2 months.
   * @returns The forecast
   */
  forecast: (d: number) => [number, number][];
}

/**
 * Holt Winters exponential smoothing
 * @return {object} Holt Winters object containing the forecast points, the residuals, the sum of squares of the residuals etc.
 */
export function holtWinters<TDatum = [number, number]>(): HoltWintersFunctionObject<TDatum>;
