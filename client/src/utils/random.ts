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

export function getRandomInt(min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  return Math.floor(getRandomNumber(min, max + 1, null));
}

export function getRandomDate(start = 0, end = Date.now()) {
  return new Date(Math.floor(start + Math.random() * (end - start)));
}
