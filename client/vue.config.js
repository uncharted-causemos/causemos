// This file is loaded by `@vue/cli-shared-utils/lib/module.js` via CommonJS require,
//  so we need to use `require` instead of `import` here as well
// https://stackoverflow.com/a/62613282
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpack = require('webpack');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { gitDescribeSync } = require('git-describe');
// makes process.env.VUE_APP_GIT_HASH variable available in every component. This variable contains the short hash of the current commit being run
process.env.VUE_APP_GIT_HASH = gitDescribeSync().hash;

module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000/api',
        logLevel: 'debug',
        changeOrigin: true,
        pathRewrite: {
          '^/api': '',
        },
      },
    },
  },
  configureWebpack: (config) => {
    // tweak webpack configurations, noting this will be merged with the final webpack configs
    if (process.env.NODE_ENV === 'development') {
      config.devtool = 'inline-source-map';
    }
  },
  chainWebpack: (config) => {
    config.plugin('provide').use(webpack.ProvidePlugin, [
      {
        $: 'jquery',
      },
    ]);

    // Set alias to make import styles easier and not relative to file location
    // e.g. @import '~styles/vars' instead of @import `../../../styles/vars`
    config.resolve.alias.set('styles', path.resolve('src/styles'));

    // ignore facets as custom elements
    config.module
      .rule('vue')
      .use('vue-loader')
      .tap((options) => {
        options.compilerOptions = {
          isCustomElement: (tag) => tag.startsWith('facet-'),
        };
        return options;
      });
    if (process.env.NODE_ENV === 'test') {
      // Note: `TypeError: window.URL.createObjectURL is not a function` error
      // is thrown while webpack is loading one of our dependencies (mapbox-gl.js)
      // It looks like `URL.createObjectURL` is not defined in the current
      // test environment (we are using Jsdom under the hood I believe and https://github.com/jsdom/jsdom/issues/1721).
      // So we stub this function so that tests pass.
      // window.URL.createObjectURL = () => {};
    }
  },
};
