const ReactDOMServer = require("react-dom/server");
const React = require("react");
const evaluate = require("eval");
const { createMemoryHistory } = require("history");

process.on("message", ({ assetName, source, options }) => {
  tryToRenderSource(assetName, source, options);
});

/**
 * @param {string} assetName
 * @param {string} source
 * @param {{htmlHeader:string, globals:any}} options
 */
async function tryToRenderSource(assetName, source, options) {
  try {
    const renderedFile = await renderSource(assetName, source, options);

    process.send({ renderedFile });
  } catch (error) {
    console.error("Child Stack: ", error);

    process.send({ error });
  }

  process.exit();
}

/**
 * @param {string} assetName
 * @param {string} source
 * @param {{htmlHeader:string, globals:any}} options
 */
async function renderSource(assetName, source, options = {}) {
  const evaluatedSource = evaluate(
    source,
    assetName,
    getGlobalsCopy(options.globals),
    true
  );
  const keys = Object.keys(evaluatedSource);
  let element = evaluatedSource.default;

  if (hadADefaultOrJustOneComponent(evaluatedSource)) {
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

      if (renderedFile.trim().startsWith("<html")) {
        renderedFile = `${options.htmlHeader}${renderedFile}`;
      }

      return renderedFile;
    })
    .catch(ex => {
      ex.message = `File ${assetName} gave an error: ${ex.message}`;

      throw ex;
    });
}

function getGlobalsCopy(globals) {
  let globalsCopy = Object.assign({ location: {} }, globals);

  globalsCopy.global = Object.assign({}, global, globalsCopy.global);
  globalsCopy.window = Object.assign({}, global, globalsCopy.window);

  return globalsCopy;
}

function hadADefaultOrJustOneComponent(evaluatedSource) {
  const keys = Object.keys(evaluatedSource);

  return (
    evaluatedSource == null ||
    (typeof evaluatedSource.default !== "function" &&
      (keys.length > 1 || keys.length === 0))
  );
}
