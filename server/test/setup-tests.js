const path = require('path');

const pathFromProjectRoot = function (name) {
  const projectRoot = path.resolve(path.join(__dirname, '..')); // __dirname is the test directory.
  return path.join(projectRoot, name);
};

/**
 * A 'require' that assumes the path starts in the project's src directory.
 * @param name
 * @returns {any}
 */
global.rootRequire = function (name) {
  return require(pathFromProjectRoot(path.join('src', name)));
};

/**
 * A 'require' that assumes the path starts in the project's test directory.
 * @param name
 * @returns {any}
 */
global.testRequire = function (name) {
  return require(pathFromProjectRoot(path.join('test', name)));
};
