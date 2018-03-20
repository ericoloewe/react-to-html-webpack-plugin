/**
 * React plugin
 */
var ReactDOMServer = require('react-dom/server');
var React = require('react');
var evaluate = require('eval');

module.exports.ReactPlugin = class {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('react-plugins', (compilation, callback) => {
      const { assets, chunks } = compilation;

      Object.keys(assets).forEach(a => {
        const source = assets[a].source();
        const evaluatedSource = evaluate(source, a, { global, window: global }, true);
        const renderedFile = `<!DOCTYPE html>${ReactDOMServer.renderToString(React.createElement(evaluatedSource.default))}`;

        compilation.assets[`${a.replace(/\.[^/.]+$/, "")}.html`] = {
          source: () => {
            return renderedFile;
          },
          size: () => {
            return renderedFile.length;
          }
        };

        delete compilation.assets[a];
      });

      callback();
    });
  }
}