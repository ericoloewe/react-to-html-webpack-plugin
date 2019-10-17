/**
 * @typedef {{data:any, updatedDate: string, hash: string}} ConfigsCache
 */

const { exists, writeFile } = require('fs');
const { promisify } = require('util');
const path = require('path');

const existsAsync = promisify(exists);
const writeFileAsync = promisify(writeFile);
const PROJECT_PREFIX = 'react-to-static-html-webpack-plugin';
const cacheFolderPath = path.resolve(process.cwd(), 'node_modules/.cache', PROJECT_PREFIX);
const TWO_WEEKS_IN_MILLISECONDS = 1000 * 60 * 60 * 24 * 7 * 2;
const cacheExpireTimeInMilliseconds = Number(process.env.CACHE_EXPIRE_TIME_IN_MILLISECONDS) || TWO_WEEKS_IN_MILLISECONDS;

/**
 * @param {string} folderPath
 */
async function createFolderIfNeed(folderPath) {
  const { mkdir, exists } = require('fs');
  const existsAsync = promisify(exists);
  const mkdirAsync = promisify(mkdir);

  try {
    const existFolder = await existsAsync(folderPath);

    if (!existFolder) {
      await mkdirAsync(folderPath, { recursive: true });
    }
  } catch (ex) {
    console.error('Stack: ', ex);
    console.error(`There are some problems to create folder to move ${folderPath}`);
  }
}

/**
 * @param {string} key
 * @returns {null|ConfigsCache}
 */
async function getCache(key) {
  let configs = null;
  const configsPath = getConfigPathForKey(key);

  try {
    if (await existsAsync(configsPath)) {
      configs = require(configsPath);
    }
  } catch (ex) {
    console.error('There are some problems to get cache config: ', ex);
  }

  return configs;
}

/**
 * @param {string} key
 * @param {string} hash
 * @param {() => any} method
 * @returns {null|any}
 */
async function getDataFromCacheOrMethod(key, hash, method) {
  const cache = await getCache(key);
  let data;

  if (cache == null || !isValid(cache, hash)) {
    data = await Promise.resolve(method());
    await updateCache(key, data, hash);
  } else {
    data = cache.data;
  }

  return data;
}

/**
 * @param {string} key
 */
function getConfigPathForKey(key) {
  return path.resolve(cacheFolderPath, `${key.replace(/[\\/]/gi, '_')}.json`);
}

/**
 * @param {ConfigsCache} cache
 * @param {string} hash
 */
function isValid(cache, hash) {
  const currentDate = Date.now();
  const createdDate = Date.parse(cache.createdDate);
  const differenceBetweenDates = currentDate - createdDate;

  return differenceBetweenDates <= cacheExpireTimeInMilliseconds && cache.hash === hash;
}

/**
 * @param {string} key
 * @param {any} data
 * @param {string} hash
 */
async function updateCache(key, data, hash) {
  /** @type {ConfigsCache} */
  const cache = { createdDate: new Date().toISOString(), data, hash };
  const configsPath = getConfigPathForKey(key);

  await createFolderIfNeed(cacheFolderPath);
  await writeFileAsync(configsPath, JSON.stringify(cache, null, 2));
}

exports.getDataFromCacheOrMethod = getDataFromCacheOrMethod;
