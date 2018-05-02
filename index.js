/**
 * React To Html Webpack Plugin
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
    compiler.hooks.thisCompilation.tap("react-to-html-webpack-plugin", (compilation) => {
      compilation.hooks.additionalAssets.tapAsync("react-to-html-webpack-plugin", (doneOptimize) => {
        const { assets, chunks } = compilation;

        chunks.forEach(c => {
          try {
            if ((!this._hasChunks() || this._isChunksToWork(c.name)) && !this._isExcludedChunks(c.name)) {
              c.files.filter(f => f.indexOf(`${c.name}.js`) >= 0).forEach(f => {
                const renderedFile = this._renderSource(f, assets[f].source());
                const fileName = this._parseAssetName(f);

                compilation.assets[fileName] = this._parseRenderToAsset(renderedFile);
                c.files.push(fileName);
                c.files.splice(c.files.indexOf(f), 1);
                delete compilation.assets[f];
              });
            }
          } catch (ex) {
            compilation.errors.push(ex.stack);
          }
        });

        doneOptimize();
      });
    });
  }

  _renderSource(assetName, source) {
    const evaluatedSource = evaluate(source, assetName, this.globals, true);
    const keys = Object.keys(evaluatedSource);
    let element = evaluatedSource.default;

    if (this._hadADefaultOrJustOneComponent(evaluatedSource)) {
      throw new Error(`${assetName} must have a default or just one component`);
    }

    if (element == null) {
      element = evaluatedSource[keys[0]];
    }

    let renderedFile = ReactDOMServer.renderToString(React.createElement(element));

    if (renderedFile.trim().startsWith('<html')) {
      renderedFile = `${this.htmlHeader}${renderedFile}`;
    }

    return renderedFile;
  }

  _hadADefaultOrJustOneComponent(evaluatedSource) {
    const keys = Object.keys(evaluatedSource);

    return (
      evaluatedSource == null
      || (
        typeof (evaluatedSource.default) !== "function"
        && (
          keys.length > 1
          || keys.length === 0
        )
      )
    )
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