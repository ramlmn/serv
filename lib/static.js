'use strict';

const normalizeurl = require('normalize-url');
const parseurl = require('parse-url');
const compression = require('compression')();
const path = require('path');
const mime = require('send').mime;
const fs = require('mz/fs');

const utils = require('./utils');

// Options for server
const options = {};
function noop() {}


async function staticHandler(request, response) {
  // If comressoin is enabled then this has to be done first
  if (options.compress) {
    // Compression enabled
    compression(request, response, noop);
  }

  // Get some constants
  const method = request.method;
  const originalPath = request.url;
  const normalizedPath = parseurl(normalizeurl(originalPath)).pathname;
  const absolutePath = path.resolve(path.join(options.dir, normalizedPath));

  const logRequest = options.logger.bind(null, request, response);

  // Only handling GET  requests
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
    return utils.sendFile(request, response, ...pathFrags);
  };

  // Try to get any stats for the request path
  const requestStats = await utils.stat(absolutePath);

  if (requestStats.isDir) {
    // Request path exists and it is a directory
    // Check if any kind of index exists in that directory
    const indexName = await utils.indexExists(absolutePath);
    if (!indexName) {
      // Index not available
      if (options.listing) {
        // List the contents of the directory
        await sendDirContents(response, normalizedPath, absolutePath);
      } else if (options.rewrite) {
        await rewriteDir(response, true, normalizedPath, absolutePath);
      } else {
        utils.sendIndexNotFound(response, normalizedPath);
      }
    } else {
      response.sendFile(absolutePath, indexName);
    }
  } else if (requestStats.isFile) {
    // Request path exists and it is a file
    response.sendFile(absolutePath);
  } else {
    // Not a real directory|file exists
    // Rewrite might do something
    if (options.rewrite) {
      await rewriteDir(response, false, normalizedPath, absolutePath);
    } else {
      utils.send404(response, normalizedPath);
    }
  }

  // Finally, log status of request and response
  logRequest();
}


/**
 * Send directory contents to the client in HTML
 *
 * @param {Object} res Response object
 * @param {String} normalizedPath
 * @param {String} absolutePath
 */
async function sendDirContents(response, normalizedPath, absolutePath) {
  response.end(await getDirContents(normalizedPath, absolutePath));
}


/**
 * Generates HTML to display directory contents
 *
 * @param {String} urlPath URL pathname
 * @param {String} absolutePath absolute path to a directory
 * @returns {String}
 */
async function getDirContents(urlPath, absolutePath) {
  const directoryList = await fs.readdir(absolutePath);

  const anchors = directoryList
    .map(item => {
      try {
        const stats = fs.statSync(path.join(absolutePath, item));
        return {
          name: item,
          isDir: stats.isDirectory(),
        };
      } catch(error) {
        return {};
      }
    })
    .map(item => {
      if (!item.name) {
        // Previously stat failed, don't include the item
        return;
      }

      const flags = [];
      if (item.isDir) {
        // For adding trailing slash to indicate a directory
        flags.push('/');
      }

      return `<li>
        <a href="${urlPath}/${item.name}${flags.join('')}">${item.name}${flags.join('')}</a>
      </li>`;
    });

  if (urlPath === '/') {
    // Request is not for the root
    // Add .. as the first entry, for traversing back
    anchors.unshift('<li><a href="../">../</a></li>');
  }

  return getConcatenatedHTML(urlPath, anchors.join(''));
}


/**
 * Return html doument-ish string
 *
 * @param {String} basename URL pathname
 * @param {String} content content tot inject
 * @returns {String}
 */
function getConcatenatedHTML(basename, content) {
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
 * Try rewrites...
 *
 * @param {Object} response http response object
 * @param {Boolean} [noIndex=false] Pritty sure index dosent exist?
 * @param {String} absolutePath absolute path
 */
async function rewriteDir(response, noIndex = false, normalizedPath, absolutePath) {
  if (noIndex) {
    // Pritty sure request is for a dir, it exists
    // and it's index doesnt exist
    await simulateRewrite(response, normalizedPath, absolutePath);
  } else if (await utils.dirExists(absolutePath)) {
    // It's a directory, serve its index if it exists
    const indexName = await utils.indexExists(absolutePath);
    if (indexName) {
      // Index exists, send it
      response.sendFile(absolutePath, indexName);
    } else {
      // index doesnt exist
      await simulateRewrite(response, normalizedPath, absolutePath);
    }
  } else {
    await simulateRewrite(response, normalizedPath, absolutePath);
  }
}


/**
 * Simulates rewite thing...
 *
 * @param {Object} response http response object
 * @param {String} normalizedPath url path
 * @param {String} absolutePath absolute path
 */
async function simulateRewrite(response, normalizedPath, absolutePath) {
  // URL doesnt point to a directory or file
  if (mime.lookup(absolutePath) === 'application/octet-stream') {
    // Response is supposed to be a directory-ish thing
    // So serve root if any
    if (await utils.indexExists(options.dir)) {
      // Try to serve file in root
      response.sendFile(options.dir, 'index.html');
    } else {
      // 404 because nothing to do
      utils.send404(response, normalizedPath);
    }
  } else {
    // Response is supposed to be a file-ish
    // It's not availabe, so, 404 it
    utils.send404(response, normalizedPath);
  }
}


function handler(opts) {
  // Save options
  for (let opt in opts) { // eslint-disable-line guard-for-in
    options[opt] = opts[opt];
  }
  // Return handler
  return staticHandler;
}

module.exports = handler;
