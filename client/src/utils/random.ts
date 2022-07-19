/**
* Copyright © 2014-2018 Uncharted Software Inc. All rights reserved.
*
* Property of Uncharted™, formerly Oculus Info Inc.
* http://uncharted.software/
*
* This software is the confidential and proprietary information of
* Uncharted Software Inc. ("Confidential Information"). You shall not
* disclose such Confidential Information and shall use it only in
* accordance with the terms of the license agreement you entered into
* with Uncharted Software Inc.
*/

export function getRandomBoolean() {
  return Boolean(getRandomInt(0, 1));
}

export function getRandomNumber(min = Number.MIN_VALUE / 2, max = Number.MAX_VALUE / 2, precision: number | null = null) {
  let number = Math.random() * (max - min) + min;
  if (precision != null) {
    const precisionFactor = 10 ** precision;
    number = Math.round(number * precisionFactor) / precisionFactor;
  }
  return number;
}

// From https://stackoverflow.com/a/47593316
// Pad seed with Phi, Pi and E.
// https://en.wikipedia.org/wiki/Nothing-up-my-sleeve_number

export function getRandomNumberGenerator(seed = 1337) {
  // XOR seed with a 32-bit number
  seed = seed ^ 0xDEADBEEF;
  return sfc32(0x9E3779B9, 0x243F6A88, 0xB7E15162, seed);
}

export function getSeededRandomNumber(
  seededRandomNumberGenerator: () => number,
  min = Number.MIN_VALUE / 2,
  max = Number.MAX_VALUE / 2
) {
  return seededRandomNumberGenerator() * (max - min) + min;
}

// A small and fast random number generator that can be seeded, unlike
//  Math.random()
function sfc32(a: number, b: number, c: number, d: number) {
  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function getRandomInt(min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  return Math.floor(getRandomNumber(min, max + 1, null));
}

export function getRandomDate(start = 0, end = Date.now()) {
  return new Date(Math.floor(start + Math.random() * (end - start)));
}
