'use strict';

const path = require('path');
const send = require('send');
const fs = require('mz/fs');


/**
 * Checks if a 'directory' exists or not
 *
 * @param {Array} pathFrags fragments of path to a possible directory
 * @returns {Boolean} path points to a directory?
 */
async function dirExists(...pathFrags) {
  // Convert relative path to absolute
  // Carefull, relativePath cannot be something like ../../../../../etc/passwd
  const absolutePath = path.resolve(path.join(...pathFrags));
  try {
    const stats = await fs.stat(absolutePath);
    if (stats.isDirectory()) {
      return true;
    } else {
      return false;
    }
  } catch(error) {
    // Failed to stat, which means directory doesn't exist
    return false;
  }
}


/**
 * Checks if a 'file' exists or not
 *
 * @param {Array} pathFrags fragments of path to a possible file
 * @returns {Boolean} path points to a file?
 */
async function fileExists(...pathFrags) {
  // Convert relative path to absolute
  const absolutePath = path.resolve(path.join(...pathFrags));

  try {
    const stats = await fs.stat(absolutePath);
    if (stats.isFile()) {
      // True file provided
      return true;
    } else {
      return false;
    }
  } catch(error) {
    // Failed to stat, which means file doesn't exist
    return false;
  }
}


/**
 * Stat and return the result
 *
 * @param {String} absolutePath path to stat
 * @returns {Object} Stats of path
 */
async function stat(absolutePath) {
  try {
    const stats = await fs.stat(absolutePath);
    if (!stats) {
      // Failed to stat
      return {};
    }

    // Stats available
    return {
      isFile: stats.isFile(),
      isDir: stats.isDirectory(),
    };
  } catch(error) {
    // Failed to stat
    return {};
  }
}


/**
 * Check if index files exist
 *
 * @param {String} absolutePath Path to check in
 * @returns {String} Name if index, falsy if no index exists
 */
async function indexExists(absolutePath) {
  const indexes = ['index.html', 'index.htm'];
  for (const index of indexes) {
    if (await fileExists(absolutePath, index)) {
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
 * @param {String} requestPath url path
 */
function send404(response, requestPath) {
  response.statusCode = 404;
  response.setHeader('Content-Type', 'text/html');
  response.end(`<pre><em>${requestPath}</em> not found.</pre>`);
}


/**
 * Send Index not found to client
 *
 * @param {any} response http response object
 * @param {any} requestPath url path
 */
function sendIndexNotFound(response, requestPath) {
  response.statusCode = 404;
  response.setHeader('Content-Type', 'text/html');
  response.end(`<pre>Index not found for <em>${requestPath}</em></pre>`);
}


module.exports = {
  dirExists,
  fileExists,
  stat,
  indexExists,
  sendFile,
  send404,
  sendIndexNotFound,
};
