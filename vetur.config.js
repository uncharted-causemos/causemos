// vetur.config.js
// Used for advanced vetur configuration.
//  In our case, it tells vetur to try to resolve `@/components/example` imports
//  found in `lang='ts'` files relative to the ./client directory, rather than
//  from the root `causemos` directory.
// This is helpful if you want to open the `causemos` directory in VS code
//  without all of the imports throwing errors.
// Read more here:
// https://vuejs.github.io/vetur/guide/setup.html#advanced
// https://vuejs.github.io/vetur/reference/
/** @type {import('vls').VeturConfig} */
module.exports = {
  projects: ['./client'],
};
