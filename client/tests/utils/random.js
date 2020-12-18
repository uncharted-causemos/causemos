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

export function getRandomNumber(min = Number.MIN_VALUE / 2, max = Number.MAX_VALUE / 2, precision) {
  let number = Math.random() * (max - min) + min;
  if (precision != null) {
    const precisionFactor = 10 ** precision;
    number = Math.round(number * precisionFactor) / precisionFactor;
  }
  return number;
}

export function getRandomInt(min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  return Math.floor(getRandomNumber(min, max + 1));
}

const alphaCharacters = 'abcdefghijklmnopqrstuvwxyz';
const numericCharacters = '0123456789';
const alphaNumericCharacters = alphaCharacters + numericCharacters;

function getRandomCharacterFromCharset(charset) {
  const character = getRandomValueFromEnum(charset);
  if (getRandomBoolean()) {
    return character.toUpperCase();
  } else {
    return character.toLowerCase();
  }
}

export function getRandomAlphaCharacter() {
  return getRandomCharacterFromCharset(alphaCharacters);
}

export function getRandomAlphaNumericString(length = getRandomInt(3, 25)) {
  let str = '';
  for (let i = 0; i < length; i++) {
    str += getRandomCharacterFromCharset(alphaNumericCharacters);
  }
  return str;
}

export function getRandomAlphaString(length = getRandomInt(3, 20)) {
  let str = '';
  for (let i = 0; i < length; i++) {
    str += getRandomAlphaCharacter();
  }
  return str;
}

export function getRandomHeading() {
  return getRandomNumber(0, 360, 3);
}

export function getRandomLatitude(minLat = -90, maxLat = 90) {
  return getRandomNumber(minLat, maxLat, 5);
}

export function getRandomLongitude(minLon = -180, maxLon = 180) {
  return getRandomNumber(minLon, maxLon, 5);
}

export function getArrayOfRandomLength(minItems, maxItems, mapFn) {
  return Array.from({ length: getRandomInt(minItems, maxItems) }, mapFn);
}

export function getShuffledArray(itemsToShuffle) {
  let currentIndex = itemsToShuffle.length;
  let tempValue;
  let randomIndex;

  const shuffledArray = itemsToShuffle.slice();

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex = currentIndex - 1;

    tempValue = shuffledArray[currentIndex];
    shuffledArray[currentIndex] = shuffledArray[randomIndex];
    shuffledArray[randomIndex] = tempValue;
  }
  return shuffledArray;
}

export function getRandomValueFromEnum(enumObject, excludeValues = []) {
  if (enumObject == null) {
    return null;
  }

  const enumValues = Object.values(enumObject);
  return getRandomValueFromArray(enumValues, excludeValues);
}

export function getRandomValueFromArray(array, excludeValues = []) {
  if (array == null) {
    return null;
  }

  const arrayToSearch = array.slice();
  excludeValues.forEach((valueToExclude) => {
    const valueToExcludeIndex = arrayToSearch.findIndex((enumValue) => valueToExclude === enumValue);
    if (valueToExcludeIndex >= 0) {
      arrayToSearch.splice(valueToExcludeIndex, 1);
    }
  });

  return arrayToSearch[getRandomInt(0, arrayToSearch.length - 1)];
}

const loremIpsumWords = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'ut', 'aliquam', 'purus', 'luctus', 'venenatis',
  'lectus', 'magna', 'fringilla', 'urna', 'porttitor', 'rhoncus', 'non', 'enim', 'praesent', 'elementum', 'facilisis', 'leo', 'vel',
  'est', 'ullamcorper', 'eget', 'nulla', 'facilisi', 'etiam', 'dignissim', 'diam', 'quis', 'lobortis', 'scelerisque', 'fermentum', 'dui',
  'faucibus', 'in', 'ornare', 'quam', 'viverra', 'orci', 'sagittis', 'eu', 'volutpat', 'odio', 'mauris', 'massa', 'vitae', 'tortor',
  'condimentum', 'lacinia', 'eros', 'donec', 'ac', 'tempor', 'dapibus', 'ultrices', 'iaculis', 'nunc', 'sed', 'augue', 'lacus', 'congue',
  'consequat', 'felis', 'et', 'pellentesque', 'commodo', 'egestas', 'phasellus', 'eleifend', 'pretium', 'vulputate', 'sapien', 'nec',
  'malesuada', 'bibendum', 'arcu', 'curabitur', 'velit', 'sodales', 'sem', 'integer', 'justo', 'vestibulum', 'risus', 'ultricies',
  'tristique', 'aliquet', 'at', 'auctor', 'id', 'cursus', 'metus', 'mi', 'posuere', 'sollicitudin', 'a', 'semper', 'duis', 'tellus',
  'mattis', 'nibh', 'proin', 'nisl', 'habitant', 'morbi', 'senectus', 'netus', 'fames', 'turpis', 'tempus', 'pharetra', 'hendrerit',
  'gravida', 'blandit', 'hac', 'habitasse', 'platea', 'dictumst', 'quisque', 'nisi', 'suscipit', 'maecenas', 'cras', 'aenean',
  'placerat', 'tincidunt', 'erat', 'imperdiet', 'euismod', 'porta', 'mollis', 'nullam', 'feugiat', 'fusce', 'suspendisse', 'potenti',
  'vivamus', 'dictum', 'varius', 'molestie', 'accumsan', 'neque', 'convallis', 'nam', 'pulvinar', 'laoreet', 'interdum', 'libero', 'cum',
  'sociis', 'natoque', 'penatibus', 'magnis', 'dis', 'parturient', 'montes', 'nascetur', 'ridiculus', 'mus', 'ligula', 'ante', 'rutrum',
  'vehicula'
];

export function getRandomLoremIpsumWord() {
  return loremIpsumWords[getRandomInt(0, loremIpsumWords.length - 1)];
}

export function getRandomLoremIpsumSentence(wordCount) {
  if (wordCount == null) {
    wordCount = getRandomInt(3, 15);
  }

  const ipsumWords = [];
  for (let i = 0; i < wordCount; i += 1) {
    ipsumWords.push(getRandomLoremIpsumWord());
  }
  return ipsumWords.join(' ');
}

export function getRandomColorHexString() {
  const r = getRandomInt(0, 0xFF).toString(16).padStart(2, '0');
  const g = getRandomInt(0, 0xFF).toString(16).padStart(2, '0');
  const b = getRandomInt(0, 0xFF).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function getRandomDate(start = 0, end = Date.now()) {
  return new Date(Math.floor(start + Math.random() * (end - start)));
}
