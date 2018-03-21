/**
 * React plugin
 */
const ReactDOMServer = require("react-dom/server");
const React = require("react");
const evaluate = require("eval");
const path = require("path");

module.exports = class ReactToHtmlWebpackPlugin {
  constructor(props = {}) {
    this.globals = props.globals || { global, window: global };
    this.htmlHeader = props.htmlHeader || "<!DOCTYPE html>";
    this.chunks = props.chunks || [];
    this.excludedChunks = props.excludedChunks || [];
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap("react-plugins", (compilation) => {
      compilation.hooks.optimizeAssets.tapAsync("react-plugins", (_, doneOptimize) => {
        const { assets, chunks } = compilation;

        try {
          chunks.forEach(c => {
            if ((!this._hasChunks() || this._isChunksToWork(c.id)) && !this._isExcludedChunks(c.id)) {
              c.files.forEach(f => {
                const renderedFile = this._renderSource(f, assets[f].source());

                compilation.assets[this._parseAssetName(f)] = this._parseRenderToAsset(`${this.htmlHeader}${renderedFile}`);

                delete compilation.assets[f];
              });
            }
          });
        } catch (ex) {
          compilation.errors.push(ex.stack);
        }

        doneOptimize();
      });
    });
  }

  _renderSource(assetName, source) {
    const evaluatedSource = evaluate(source, assetName, this.globals, true);

    if (evaluatedSource == null || typeof (evaluatedSource.default) !== "function") {
      throw new Error(`${assetName} must have a default component`);
    }

    return ReactDOMServer.renderToString(React.createElement(evaluatedSource.default));
  }

  _parseAssetName(assetName) {
    return `${assetName.replace(/\.[^/.]+$/, "")}.html`;
  }

  _parseRenderToAsset(render) {
    return {
      source: () => {
        return render;
      },
      size: () => {
        return render.length;
      }
    };
  }

  _hasChunks() {
    return this.chunks.length > 0;
  }

  _isChunksToWork(chunkId) {
    return this.chunks.some(c => c === chunkId);
  }

  _isExcludedChunks(chunkId) {
    return this.excludedChunks.some(c => c === chunkId);
  }
}