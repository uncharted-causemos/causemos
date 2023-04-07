/* eslint-disable */

// https://github.com/antoinevastel/zodiac-ts

const exports = {};

/*Simple exponential smoothing */
exports.SimpleExponentialSmoothing = function (data, alpha) {
  if (data == null) {
    throw 'data parameter is null';
  } else if (data.length < 2) {
    throw "data doesn't contain enough data to make a prediction";
  }

  if (alpha > 1 || alpha < 0) {
    throw 'alpha parameter must be between 0 and 1';
  }

  this.data = data;
  this.alpha = alpha;
  this.forecast = null;
};

exports.SimpleExponentialSmoothing.prototype.predict = function () {
  var forecast = Array();
  forecast[0] = null;
  forecast[1] = 0.5 * (this.data[0] + this.data[1]);

  for (var i = 2; i <= this.data.length; ++i) {
    forecast[i] = this.alpha * (this.data[i - 1] - forecast[i - 1]) + forecast[i - 1];
  }

  this.forecast = forecast;
  return forecast;
};

exports.SimpleExponentialSmoothing.prototype.getForecast = function () {
  if (this.forecast == null) {
    this.predict();
  }
  return this.forecast;
};

exports.SimpleExponentialSmoothing.prototype.computeMeanSquaredError = function () {
  var SSE = 0.0;
  var n = 0;
  for (var i = 0; i < this.data.length; ++i) {
    if (this.data[i] != null && this.forecast[i] != null) {
      SSE += Math.pow(this.data[i] - this.forecast[i], 2);
      n++;
    }
  }
  return (1 / (n - 1)) * SSE;
};

exports.SimpleExponentialSmoothing.prototype.optimizeParameter = function (iter) {
  var incr = 1 / iter;
  var bestAlpha = 0.0;
  var bestError = -1;
  this.alpha = bestAlpha;

  while (this.alpha < 1) {
    var forecast = this.predict();
    var error = this.computeMeanSquaredError();
    if (error < bestError || bestError == -1) {
      bestAlpha = this.alpha;
      bestError = error;
    }
    this.alpha += incr;
  }

  this.alpha = bestAlpha;
  return this.alpha;
};

/*Double exponential smoothing */

exports.DoubleExponentialSmoothing = function (data, alpha) {
  if (data == null) {
    throw 'data parameter is null';
  } else if (data.length < 2) {
    throw "data doesn't contain enough data to make a prediction";
  }

  if (alpha > 1 || alpha < 0) {
    throw 'alpha parameter must be between 0 and 1';
  }

  this.data = data;
  this.alpha = alpha;
  this.forecast = null;
};

exports.DoubleExponentialSmoothing.prototype.predict = function (horizon) {
  var smoothings = Object();
  smoothings.first = Array();
  smoothings.second = Array();

  smoothings.first[0] = this.data[0];
  smoothings.first[1] = this.data[1];

  for (var i = 2; i < this.data.length; ++i) {
    smoothings.first[i] = this.alpha * this.data[i] + (1 - this.alpha) * smoothings.first[i - 1];
  }

  smoothings.second[0] = smoothings.first[0];
  for (var i = 1; i < this.data.length; ++i) {
    smoothings.second[i] =
      this.alpha * smoothings.first[i] + (1 - this.alpha) * smoothings.second[i - 1];
  }

  smoothings.a = Array();
  smoothings.b = Array();
  for (var i = 1; i < this.data.length; ++i) {
    smoothings.a[i] =
      (this.alpha / (1 - this.alpha)) * (smoothings.first[i] - smoothings.second[i]);
    smoothings.b[i] = 2 * smoothings.first[i] - smoothings.second[i];
  }

  var forecast = Array();
  forecast[0] = null;
  forecast[1] = null;
  for (var i = 2; i <= this.data.length; ++i) {
    forecast[i] = smoothings.a[i - 1] + smoothings.b[i - 1];
  }

  for (var i = this.data.length + 1; i < this.data.length + horizon; ++i) {
    forecast[i] = forecast[i - 1] + smoothings.a[this.data.length - 1];
  }

  this.forecast = forecast;
  return forecast;
};

exports.DoubleExponentialSmoothing.prototype.getForecast = function () {
  if (this.forecast == null) {
    return null;
  }
  return this.forecast;
};

exports.DoubleExponentialSmoothing.prototype.computeMeanSquaredError = function () {
  var SSE = 0.0;
  var n = 0;
  for (var i = 0; i < this.data.length; ++i) {
    if (this.data[i] != null && this.forecast[i] != null) {
      SSE += Math.pow(this.data[i] - this.forecast[i], 2);
      n++;
    }
  }
  return (1 / (n - 1)) * SSE;
};

exports.DoubleExponentialSmoothing.prototype.optimizeParameter = function (iter) {
  var incr = 1 / iter;
  var bestAlpha = 0.0;
  var bestError = -1;
  this.alpha = bestAlpha;

  while (this.alpha < 1) {
    var forecast = this.predict();
    var error = this.computeMeanSquaredError();
    if (error < bestError || bestError == -1) {
      bestAlpha = this.alpha;
      bestError = error;
    }
    this.alpha += incr;
  }

  this.alpha = bestAlpha;
  return this.alpha;
};

/*Holt smoothing */
exports.HoltSmoothing = function (data, alpha, gamma) {
  if (data == null) {
    throw 'data parameter is null';
  } else if (data.length < 2) {
    throw "data doesn't contain enough data to make a prediction";
  }

  if (alpha > 1 || alpha < 0) {
    throw 'alpha parameter must be between 0 and 1';
  }

  if (gamma > 1 || gamma < 0) {
    throw 'gamma parameter must be between 0 and 1';
  }

  this.data = data;
  this.alpha = alpha;
  this.gamma = gamma;
  this.forecast = null;
};

exports.HoltSmoothing.prototype.predict = function (horizon) {
  var A = Array();
  var B = Array();

  A[0] = 0;
  B[0] = this.data[0];

  for (var i = 1; i < this.data.length; ++i) {
    B[i] = this.alpha * this.data[i] + (1 - this.alpha) * (B[i - 1] + A[i - 1]);
    A[i] = this.gamma * (B[i] - B[i - 1]) + (1 - this.gamma) * A[i - 1];
  }

  var forecast = Array();
  forecast[0] = null;
  for (var i = 1; i <= this.data.length; ++i) {
    forecast[i] = A[i - 1] + B[i - 1];
  }

  for (var i = this.data.length + 1; i < this.data.length + horizon; ++i) {
    forecast[i] = forecast[i - 1] + A[this.data.length - 1];
  }

  this.forecast = forecast;
  return forecast;
};

exports.HoltSmoothing.prototype.getForecast = function () {
  if (this.forecast == null) {
    return null;
  }
  return this.forecast;
};

exports.HoltSmoothing.prototype.computeMeanSquaredError = function () {
  var SSE = 0.0;
  var n = 0;
  for (var i = 0; i < this.data.length; ++i) {
    if (this.data[i] != null && this.forecast[i] != null) {
      SSE += Math.pow(this.data[i] - this.forecast[i], 2);
      n++;
    }
  }
  return (1 / (n - 1)) * SSE;
};

exports.HoltSmoothing.prototype.optimizeParameters = function (iter) {
  var incr = 1 / iter;
  var bestAlpha = 0.0;
  var bestError = -1;
  this.alpha = bestAlpha;
  var bestGamma = 0.0;
  this.gamma = bestGamma;

  while (this.alpha < 1) {
    while (this.gamma < 1) {
      var forecast = this.predict();
      var error = this.computeMeanSquaredError();
      if (error < bestError || bestError == -1) {
        bestAlpha = this.alpha;
        bestGamma = this.gamma;
        bestError = error;
      }
      this.gamma += incr;
    }
    this.gamma = 0;
    this.alpha += incr;
  }

  this.alpha = bestAlpha;
  this.gamma = bestGamma;
  return { alpha: this.alpha, gamma: this.gamma };
};

/*Holt Winters smoothing */
exports.HoltWintersSmoothing = function (data, alpha, gamma, delta, seasonLength, mult) {
  if (data == null) {
    throw 'data parameter is null';
  } else if (data.length < 2) {
    throw "data doesn't contain enough data to make a prediction";
  }

  if (alpha > 1 || alpha < 0) {
    throw 'alpha parameter must be between 0 and 1';
  }

  if (gamma > 1 || gamma < 0) {
    throw 'gamma parameter must be between 0 and 1';
  }

  if (delta > 1 || delta < 0) {
    throw 'delta parameter must be between 0 and 1';
  }

  if (seasonLength < 0) {
    throw 'seasonLength parameter must be a positive integer';
  }

  if (mult != true && mult != false) {
    throw 'mult parameter must be a boolean';
  }

  this.data = data;
  this.alpha = alpha;
  this.gamma = gamma;
  this.delta = delta;
  this.seasonLength = seasonLength;
  this.mult = mult;
  this.forecast = null;
};

exports.HoltWintersSmoothing.prototype.predict = function () {
  if (this.mult) {
    return this.predictMult();
  } else {
    return this.predictAdd();
  }
};

exports.HoltWintersSmoothing.prototype.predictAdd = function () {
  var A = Array();
  var B = Array();
  var S = Array();

  A[this.seasonLength - 1] = 0;
  var averageFirstSeason = 0;
  for (var i = 0; i < this.seasonLength; ++i) {
    averageFirstSeason += this.data[i];
  }
  B[this.seasonLength - 1] = averageFirstSeason / this.seasonLength;

  for (var i = 0; i < this.seasonLength; ++i) {
    S[i] = this.data[i] - averageFirstSeason / this.seasonLength;
  }

  for (var i = this.seasonLength; i < this.data.length; ++i) {
    B[i] =
      this.alpha * (this.data[i] - S[i - this.seasonLength]) +
      (1 - this.alpha) * (B[i - 1] + A[i - 1]);
    A[i] = this.gamma * (B[i] - B[i - 1]) + (1 - this.gamma) * A[i - 1];
    S[i] = this.delta * (this.data[i] - B[i]) + (1 - this.delta) * S[i - this.seasonLength];
  }

  var forecast = Array();
  for (var i = 0; i < this.seasonLength; ++i) {
    forecast[i] = null;
  }

  for (var i = this.seasonLength; i < this.data.length; ++i) {
    forecast[i] = A[i - 1] + B[i - 1] + S[i - this.seasonLength];
  }

  for (var i = this.data.length; i < this.data.length + this.seasonLength; ++i) {
    forecast[i] =
      B[this.data.length - 1] +
      (i - this.data.length + 1) * A[this.data.length - 1] +
      S[i - this.seasonLength];
  }

  this.forecast = forecast;
  return forecast;
};

exports.HoltWintersSmoothing.prototype.predictMult = function () {
  var A = Array();
  var B = Array();
  var S = Array();

  A[this.seasonLength - 1] = 0;
  var averageFirstSeason = 0;
  for (var i = 0; i < this.seasonLength; ++i) {
    averageFirstSeason += this.data[i];
  }
  B[this.seasonLength - 1] = averageFirstSeason / this.seasonLength;

  for (var i = 0; i < this.seasonLength; ++i) {
    S[i] = this.data[i] / (averageFirstSeason / this.seasonLength);
  }

  for (var i = this.seasonLength; i < this.data.length; ++i) {
    B[i] =
      this.alpha * (this.data[i] / S[i - this.seasonLength]) +
      (1 - this.alpha) * (B[i - 1] + A[i - 1]);
    A[i] = this.gamma * (B[i] - B[i - 1]) + (1 - this.gamma) * A[i - 1];
    S[i] = this.delta * (this.data[i] / B[i]) + (1 - this.delta) * S[i - this.seasonLength];
  }

  var forecast = Array();
  for (var i = 0; i < this.seasonLength; ++i) {
    forecast[i] = null;
  }

  for (var i = this.seasonLength; i < this.data.length; ++i) {
    forecast[i] = (A[i - 1] + B[i - 1]) * S[i - this.seasonLength];
  }

  for (var i = this.data.length; i < this.data.length + this.seasonLength; ++i) {
    forecast[i] =
      (B[this.data.length - 1] + (i - this.data.length + 1) * A[this.data.length - 1]) *
      S[i - this.seasonLength];
  }

  this.forecast = forecast;
  return forecast;
};

exports.HoltWintersSmoothing.prototype.getForecast = function () {
  if (this.forecast == null) {
    this.predict();
  }
  return this.forecast;
};

exports.HoltWintersSmoothing.prototype.computeMeanSquaredError = function () {
  var SSE = 0.0;
  var n = 0;
  for (var i = 0; i < this.data.length; ++i) {
    if (this.data[i] != null && this.forecast[i] != null) {
      SSE += Math.pow(this.data[i] - this.forecast[i], 2);
      n++;
    }
  }
  return (1 / (n - 1)) * SSE;
};

exports.HoltWintersSmoothing.prototype.optimizeParameters = function (iter) {
  var incr = 1 / iter;
  var bestAlpha = 0.0;
  var bestError = -1;
  this.alpha = bestAlpha;
  var bestGamma = 0.0;
  this.gamma = bestGamma;
  var bestDelta = 0.0;
  this.delta = bestDelta;

  while (this.alpha < 1) {
    while (this.gamma < 1) {
      while (this.delta < 1) {
        var forecast = this.predict();
        var error = this.computeMeanSquaredError();
        if (error < bestError || bestError == -1) {
          bestAlpha = this.alpha;
          bestGamma = this.gamma;
          bestDelta = this.delta;
          bestError = error;
        }
        this.delta += incr;
      }
      this.delta = 0;
      this.gamma += incr;
    }
    this.gamma = 0;
    this.alpha += incr;
  }

  this.alpha = bestAlpha;
  this.gamma = bestGamma;
  this.delta = bestDelta;
  return { alpha: this.alpha, gamma: this.gamma, delta: this.delta };
};

/*Moving average */

exports.MovingAverage = function (data) {
  if (data == null) {
    throw 'data parameter is null';
  } else if (data.length < 3) {
    throw "data doesn't contain enough data to make a prediction";
  }

  this.data = data;
};

exports.MovingAverage.prototype.smooth = function (order) {
  if (order < 1) {
    throw 'order parameter must be a positive integer';
  }

  var result = Array();

  for (var i = order; i < this.data.length - order; ++i) {
    result[i] = 0;
    for (var j = i - order; j <= i + order; j++) {
      result[i] += this.data[j];
    }
    result[i] /= 2 * order + 1;
  }

  return result;
};

export default exports;
