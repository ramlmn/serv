'use strict';

const {promisify} = require('util');
const path = require('path');
const send = require('send');
const fs = require('fs');

const fsStat = promisify(fs.stat);


/**
 * Stat and return the result
 *
 * @param {string} pathFrags path to stat
 * @returns {Object} Stats of path
 */
async function stat(...pathFrags) {
  const absPath = path.resolve(path.join(...pathFrags));
  try {
    const stats = await fsStat(absPath);
    if (!stats) {
      // Failed to stat
      return {};
    }

    // Stats available
    return {
      isFile: stats.isFile(),
      isDir: stats.isDirectory(),
    };
  } catch (error) {
    // Failed to stat
    return {};
  }
}


/**
 * Check if index files exist
 *
 * @param {string} absPath Path to check in
 * @returns {string|false} Name if index exists, falsy if no index exists
 */
async function indexExists(absPath) {
  const indexes = ['index.html', 'index.htm'];
  for (const index of indexes) {
    const stats = await stat(absPath, index);
    if (stats.isFile) {
      return index;
    }
  }

  return false;
}

/**
 * Check if 404 files exist
 *
 * @param {string} absPath Path to check in
 * @returns {string|false} Name if 404 file exists, falsy if none exists
 */
async function f404Exists(absPath) {
  const indexes = ['404.html', '404.htm'];
  for (const index of indexes) {
    const stats = await stat(absPath, index);
    if (stats.isFile) {
      return index;
    }
  }

  return false;
}


/**
 * Send a file to client
 *
 * @param {Object} response http request object
 * @param {Object} response http response object
 * @param {Array} pathFrags path fragments to file
 */
function sendFile(request, response, ...pathFrags) {
  // Use send and pipe file
  const pathToFile = path.resolve(path.join(...pathFrags));
  const stream = send(request, pathToFile, {dotfiles: 'allow'});
  stream.pipe(response);
}


/**
 * Send 404 to the client
 *
 * @param {Object} response http response object
 * @param {string} message 404 message
 * @param {string} rootDir path to check in for file
 */
async function send404(response, message, rootDir = null) {
  if (rootDir) {
    const file404 = await f404Exists(rootDir);
    if (file404) {
      response.sendFile(rootDir, file404);
      return;
    }
  }

  response.statusCode = 404;
  response.setHeader('Content-Type', 'text/html');
  response.end(message);
}


module.exports = {
  stat,
  indexExists,
  sendFile,
  send404,
};
