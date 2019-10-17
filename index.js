const ReactDOMServer = require('react-dom/server');
const React = require('react');
const evaluate = require('eval');

const { getDataFromCacheOrMethod } = require('./cache');

const GLOBALS_MOCK = { global, window: global };

module.exports = class ReactToStaticHtmlWebpackPlugin {
  constructor(props = {}) {
    this.globals = Object.assign(GLOBALS_MOCK, props.globals) || GLOBALS_MOCK;
    this.htmlHeader = props.htmlHeader || '<!DOCTYPE html>';
    this.chunks = props.chunks || [];
    this.excludedChunks = ['runtime', ...(props.excludedChunks || [])];
    this.postRender = props.postRender || [];
    this.keepJsFile = props.keepJsFile || false;
    this.cache = props.cache || true;
  }

  /**
   * @param {*} compiler
   */
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('react-to-static-html-webpack-plugin', compilation => {
      compilation.hooks.additionalAssets.tapAsync('react-to-static-html-webpack-plugin', async doneOptimize => {
        const startDate = Date.now();
        const { assets, chunks } = compilation;

        console.log('STARTED => ', startDate);

        try {
          await this._compileChunk(chunks, assets, compilation);

          console.log('L => Finished in (ms): ', Date.now() - startDate);
        } catch (ex) {
          console.log('E => Finished in (ms): ', Date.now() - startDate);
          compilation.errors.push(ex);
        }

        doneOptimize();
      });
    });
  }

  async _compileChunk(chunks, assets, compilation) {
    const runtimeAsset = this._getRuntimeFromAssetsOrDefault(assets);
    const runtimeAssetSource = runtimeAsset != null ? runtimeAsset.source() : '';

    const promises = chunks
      .filter(c => (!this._hasChunks() || this._isChunksToWork(c.name)) && !this._isExcludedChunks(c.name))
      .map(c => this._compileChunkSources(c, assets, compilation, runtimeAssetSource));

    await Promise.all(promises);
  }

  async _compileChunkSources(chunk, assets, compilation, runtimeAssetSource) {
    const promises = chunk.files
      .filter(f => f.indexOf(`${chunk.name}.js`) >= 0)
      .map(async f => {
        const sourceToRender = `${runtimeAssetSource}\n${assets[f].source()}`;
        const hash = chunk.contentHash.javascript;
        const renderedFile = await this._renderSourceIfNeed(f, sourceToRender, hash);

        const fileName = this._parseAssetName(f);

        compilation.assets[fileName] = this._parseRenderToAsset(renderedFile);
        chunk.files.push(fileName);
        chunk.files.splice(chunk.files.indexOf(f), 1);

        if (!this.keepJsFile) {
          delete compilation.assets[f];
        }

        return renderedFile;
      });

    await Promise.all(promises);
  }

  /**
   * @param {string} assetName
   * @param {string} source
   * @param {string} hash
   * @returns {string}
   */
  async _renderSourceIfNeed(assetName, source, hash) {
    let source;

    if (this.cache) {
      source = await getDataFromCacheOrMethod(assetName, hash, async () => await this._renderSource(assetName, source));
    } else {
      source = await this._renderSource(assetName, source);
    }

    return source;
  }

  async _renderSource(assetName, source) {
    const evaluatedSource = evaluate(source, assetName, this._getGlobalsCopy(), true);
    const keys = Object.keys(evaluatedSource);
    let element = evaluatedSource.default;

    if (this._hadADefaultOrJustOneComponent(evaluatedSource)) {
      throw new Error(`${assetName} must have a default or just one component`);
    }

    if (element == null) {
      element = evaluatedSource[keys[0]];
    }

    let elementPromise = Promise.resolve(element);

    return elementPromise
      .then(element => {
        if (!React.isValidElement(element)) {
          element = React.createElement(element);
        }

        let renderedFile = ReactDOMServer.renderToString(element);

        if (renderedFile.trim().startsWith('<html')) {
          renderedFile = `${this.htmlHeader}${renderedFile}`;
        }

        this.postRender.forEach(f => {
          renderedFile = f(renderedFile);
        });

        return renderedFile;
      })
      .catch(ex => {
        ex.message = `File ${assetName} gave an error: ${ex.message}`;

        throw ex;
      });
  }

  _getGlobalsCopy() {
    let globalsCopy = Object.assign({}, this.globals);

    globalsCopy.global = Object.assign({}, globalsCopy.global);
    globalsCopy.window = Object.assign({}, globalsCopy.window);

    return globalsCopy;
  }

  _getRuntimeFromAssetsOrDefault(assets) {
    const runtimeKey = Object.keys(assets).find(a => a.includes('runtime'));

    return assets[runtimeKey];
  }

  _hadADefaultOrJustOneComponent(evaluatedSource) {
    const keys = Object.keys(evaluatedSource);

    return evaluatedSource == null || (typeof evaluatedSource.default !== 'function' && (keys.length > 1 || keys.length === 0));
  }

  _parseAssetName(assetName) {
    return `${assetName.replace(/\.[^/.]+$/, '')}.html`;
  }

  _parseRenderToAsset(render) {
    return {
      source: () => {
        return render;
      },
      size: () => {
        return render.length;
      },
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
