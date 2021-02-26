const webpack = require('webpack');
const path = require('path');

module.exports = {
  publicPath: './',
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000/api',
        logLevel: 'debug',
        changeOrigin: true,
        pathRewrite: {
          '^/api': ''
        }
      }
    }
  },
  configureWebpack: config => {
    // tweak webpack configurations, noting this will be merged with the final webpack configs
    if (process.env.NODE_ENV === 'development') {
      config.devtool = 'inline-source-map';
    }
  },
  chainWebpack: config => {
    config.plugin('provide')
      .use(webpack.ProvidePlugin, [
        {
          $: 'jquery'
        }
      ]);

    // Set alias to make import styles easier and not relative to file location
    // e.g. @import '~styles/vars' instead of @import `../../../styles/vars`
    config.resolve.alias.set('styles', path.resolve('src/styles'));

    if (process.env.NODE_ENV === 'test') {
      // Note: `TypeError: window.URL.createObjectURL is not a function` error
      // is thrown while webpack is loading one of our dependencies (mapbox-gl.js)
      // It looks like `URL.createObjectURL` is not defined in the current
      // test environment (we are using Jsdom under the hood I believe and https://github.com/jsdom/jsdom/issues/1721).
      // So we stub this function so that tests pass.
      window.URL.createObjectURL = () => {};
    }
  }
};
