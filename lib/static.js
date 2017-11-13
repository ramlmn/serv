'use strict';

const normalizeurl = require('normalize-url');
const parseurl = require('parse-url');
const compression = require('compression')();
const path = require('path');
const mime = require('send').mime;
const fsys = require('fs');

const {promisify} = require('util');

const fs = {
  readdir: promisify(fsys.readdir),
  stat: promisify(fsys.stat),
};


const servUtils = require('./utils.js');

// Options for server
const options = {};
function noop() {}


/**
 * Entrypoint for the request and responses
 *
 * @param {Object} request http request object
 * @param {Object} response http response object
 * @returns
 */
async function staticHandler(request, response) {
  // If comressoin is enabled then this has to be done first
  if (options.compress) {
    // Compression enabled
    compression(request, response, noop);
  }

  // Get some constants
  const method = request.method;
  const urlPath = request.url;
  const reqPath = parseurl(normalizeurl(urlPath)).pathname || '/';
  const absPath = path.resolve(path.join(options.dir, reqPath));

  const logRequest = options.logger.bind(null, request, response);

  // Only handling GET requests
  if (method !== 'GET') {
    // method not allowed
    response.statusCode = 405;
    response.setHeader('Allow', 'GET, HEAD');
    response.end();
    logRequest();
    return;
  }

  // Assign so that args for functions to call will be less
  response.sendFile = (...pathFrags) => {
    return servUtils.sendFile(request, response, ...pathFrags);
  };

  // Finally handle the request
  await handleReq(response, reqPath, absPath);

  // Log the request
  logRequest();
}


/**
 * Handle the request
 *
 * @param {Object} response response object
 * @param {string} reqPath URL path
 * @param {string} absPath system filepath
 */
async function handleReq(response, reqPath, absPath) {
  if (options.rewrite) {
    servRewrite(response, reqPath, absPath);
    return;
  }

  const stats = await servUtils.stat(absPath);
  const res404 = `<pre><em>${reqPath}</em> not found.</pre>`;

  if (stats.isDir) {
    const indexName = await servUtils.indexExists(absPath);
    if (!indexName) {
      if (options.listing) {
        response.end(await dirContents(reqPath, absPath));
      } else {
        servUtils.send404(response, res404, options.dir);
      }
    } else {
      response.sendFile(absPath, indexName);
    }
  } else if (stats.isFile) {
    response.sendFile(absPath);
  } else {
    servUtils.send404(response, res404, options.dir);
  }
}


/**
 * Rewrites...
 *
 * @param {Object} response response object
 * @param {string} reqPath URL path
 * @param {string} absPath system filepath
 */
async function servRewrite(response, reqPath, absPath) {
  const stats = await servUtils.stat(absPath);
  const res404 = `<pre><em>${reqPath}</em> not found.</pre>`;

  if (stats.isDir) {
    // List directory contents
    const indexName = await servUtils.indexExists(absPath);
    if (!indexName) {
      servUtils.send404(response, res404, options.dir);
    } else {
      response.sendFile(absPath, indexName);
    }
  } else if (stats.isFile) {
    response.sendFile(absPath);
  } else {
    if (mime.lookup(absPath) === 'application/octet-stream') {
      // Response is supposed to be a directory-ish thing
      const rootIndex = await servUtils.indexExists(options.dir);
      if (rootIndex) {
        response.sendFile(options.dir, rootIndex);
      } else {
        servUtils.send404(response, res404, options.dir);
      }
    } else {
      servUtils.send404(response, res404, options.dir);
    }
  }
}


/**
 * Generates HTML to display directory contents
 *
 * @param {string} urlPath URL pathname
 * @param {string} absPath absolute path to a directory
 * @returns {string}
 */
async function dirContents(urlPath, absPath) {
  const directoryList = await fs.readdir(absPath);

  const anchors = [];

  for (let item of directoryList) {
    try {
      const sysPath = path.join(absPath, item);
      const stats = await fs.stat(sysPath);

      const flags = [];
      if (stats.isDirectory()) {
        flags.push('/');
      }

      const pathname = (urlPath === '/') ? '' : urlPath;

      anchors.push(`<li><a href="${pathname}/${item}${flags.join('')}">` +
        `${item}${flags.join('')}</a></li>`);
    } catch (error) {
      continue;
    }
  }

  if (urlPath !== '/') {
    // Request is not for the root
    // Add .. as the first entry, for traversing back
    anchors.unshift('<li><a href="../">../</a></li>');
  }

  return getListingPage(urlPath, anchors.join(''));
}


/**
 * Return html doument-ish string
 *
 * @param {string} basename URL pathname
 * @param {string} content content tot inject
 * @returns {string}
 */
function getListingPage(basename, content) {
  return ['<!DOCTYPE html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8">',
    '    <meta http-equiv="X-UA-Compatible" content="IE=edge">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1">',
    '',
    `    <title>Index of ${basename}</title>`,
    '    <style>',
    '      * {',
    '        box-sizing: border-box;',
    '      }',
    '      body {',
    '        margin: 0;',
    '        padding: 16px;',
    '        font-size: 16px;',
    '        font-family: Consolas, Menlo, Monaco, monospace;',
    '        line-height: 1.5;',
    '      }',
    '      h1 {',
    '        margin: 0;',
    '        font-size: 1.25em;',
    '      }',
    '      ul {',
    '        list-style: none;',
    '        padding-left: 1em;',
    '      }',
    '      a, h1 {',
    '        text-decoration: none;',
    '        word-wrap: break-word;',
    '      }',
    '      a:hover {',
    '        text-decoration: underline;',
    '      }',
    '    </style>',
    '  </head>',
    '  <body>',
    '',
    `   <h1>Index of ${basename}</h1>`,
    '',
    `   <ul>${content}</ul>`,
    '',
    '  </body>',
    '</html>',
  ].join('\n');
}


/**
 * Returns a handler for the server
 *
 * @param {Object} [opts={}] Options for the handler
 * @returns Req/res handler for http
 */
function handler(opts = {}) {
  // Save options
  Object.assign(options, opts);
  // Return handler
  return staticHandler;
}

module.exports = handler;
