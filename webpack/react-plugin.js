/**
 * React plugin
 */
var ReactDOMServer = require('react-dom/server');

module.exports.ReactPlugin = class {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('react-plugins', (compilation, callback) => {
      const { assets, chunks } = compilation;

      // chunks.forEach(c => {
      //   console.log(c.entryModule);
      // })
      Object.keys(assets).forEach(a => {
        console.log(`assets[${a}]`, assets[a]);
        const renderedFile = ReactDOMServer.renderToString(assets[a].source());

        compilation.assets[`${a.replace(/\.[^/.]+$/, "")}.html`] = {
          source: () => {
            return renderedFile;
          },
          size: () => {
            return renderedFile.length;
          }
        };
        delete compilation.assets[a];
        // console.log(ReactDOMServer.renderToString(assets[a].source()));
      });

      callback();
    });
  }
}