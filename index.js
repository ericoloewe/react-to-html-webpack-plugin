const { fork } = require("child_process");

module.exports = class ReactToHtmlWebpackPlugin {
  constructor(props = {}) {
    this.globals = props.globals || {};
    this.htmlHeader = props.htmlHeader || "<!DOCTYPE html>";
    this.chunks = props.chunks || [];
    this.excludedChunks = props.excludedChunks || [];
    this.postRender = props.postRender || [];
    this.keepJsFile = props.keepJsFile || false;
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      "react-to-static-html-webpack-plugin",
      compilation => {
        compilation.hooks.additionalAssets.tapAsync(
          "react-to-static-html-webpack-plugin",
          doneOptimize => {
            const { assets, chunks } = compilation;
            const chunkPromises = this._compileChunk(
              chunks,
              assets,
              compilation
            );

            Promise.all(chunkPromises)
              .then(() => doneOptimize())
              .catch(ex => {
                compilation.errors.push(ex);
                doneOptimize();
              });
          }
        );
      }
    );
  }

  _compileChunk(chunks, assets, compilation) {
    return chunks
      .map(c => {
        try {
          if (
            (!this._hasChunks() || this._isChunksToWork(c.name)) &&
            !this._isExcludedChunks(c.name)
          ) {
            return this._compileChunkSources(c, assets, compilation);
          }
        } catch (ex) {
          compilation.errors.push(ex.stack);
        }

        return Promise.resolve();
      })
      .reduce((p, n) => {
        if (Array.isArray(n)) {
          p = p.concat(n);
        } else {
          p.push(n);
        }

        return p;
      }, []);
  }

  _compileChunkSources(chunk, assets, compilation) {
    return chunk.files
      .filter(f => f.indexOf(`${chunk.name}.js`) >= 0)
      .map(f => {
        const renderedFilePromise = this._renderSource(f, assets[f].source());

        renderedFilePromise.then(renderedFile => {
          this.postRender.forEach(f => {
            renderedFile = f(renderedFile);
          });

          const fileName = this._parseAssetName(f);

          compilation.assets[fileName] = this._parseRenderToAsset(renderedFile);
          chunk.files.push(fileName);
          chunk.files.splice(chunk.files.indexOf(f), 1);

          if (!this.keepJsFile) {
            delete compilation.assets[f];
          }

          return renderedFile;
        });

        return renderedFilePromise;
      });
  }

  _renderSource(assetName, source) {
    const forked = fork(require.resolve("./render-source.js"));

    return new Promise((resolve, reject) => {
      forked.on("message", ({ renderedFile, error }) => {
        if (error) {
          console.error("Stack: ", error);

          reject(error);
        } else {
          resolve(renderedFile);
        }
      });

      forked.send({
        assetName,
        source,
        options: { globals: this.globals, htmlHeader: this.htmlHeader }
      });
    });
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
};
