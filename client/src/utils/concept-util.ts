import _ from 'lodash';

export const UNKNOWN = 'Unknown';

export function conceptShortName(name: string) {
  if (_.isNil(name)) return '';

  const nameArray = name.split('/');
  return nameArray.pop()?.replace(/_/g, ' ');
}

export function conceptPrefix(concept: string) {
  return concept.split('/').splice(0, 3).join('/').replace(/_/g, ' ');
}

export function conceptSuffix(concept: string) {
  return concept.split('/').splice(3).join('/').replace(/_/g, ' ');
}

export function conceptHumanName(name: string, set: Set<string>) {
  const token = _.last(name.split('/')) || '';

  if (set.has(token)) {
    return token.replace(/_/g, ' ');
  }

  // Recursively tease out components - greedy
  let str = token;
  const concepts = [];
  while (str !== '') {
    const fragments = str.split('_') || '';
    let found = false;
    for (let i = fragments.length; i > 0; i--) {
      const concept = _.take(fragments, i).join('_');
      // console.log('\t', concept);
      if (set.has(concept)) {
        concepts.push(concept);
        str = _.takeRight(fragments, fragments.length - i).join('_');
        found = true;
        break;
      }
    }
    if (found === false) {
      console.debug('Cannot translate', token);
      return token;
    }
  }

  if (concepts.length > 0) {
    return _.reverse(concepts).join(' of ').replace(/_/g, ' ');
  }
  return token;
}

export default {
  UNKNOWN,
  conceptShortName,
  conceptPrefix,
  conceptSuffix,
  conceptHumanName
};
