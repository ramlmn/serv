'use strict';

const path = require('path');
const fs = require('fs');
const {promisify} = require('util');

const readDir = promisify(fs.readdir);

const send = require('send');
const parseUrl = require('parseurl');


/**
 * send a reponse with additional headers
 *
 * @param {Object} res http.ServerResponse
 * @param {string} body data to send
 */
const sendResponse = (res, body) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(body, 'utf8'));

  res.end(body, 'utf8');
};

/**
 * sends a 404 error
 */
const send404 = (res) => {
  res.statusCode = 404;
  return res.end(`Cannot find '${res.req.url}'`);
};

/**
 * sends a 404 error
 */
const send505 = (res) => {
  res.statusCode = 500;
  return res.end('Internal server error');
};


/**
 * returns HTML containing listing of a directory
 *
 * @param {string} root path to the root of directory
 * @param {string} pathname relative path to root
 *
 * @returns {string}
 */
const getListing = async (root, pathname) => {
  let content = '';

  try {
    if (pathname === '') {
      pathname = '/';
    }

    const sysPath = path.resolve(path.join(root, pathname));
    const files = (await readDir(sysPath))
      .sort((a, b) => a>b)
      .map(filename => {
        return `<li><a href="${pathname}/${filename}">${filename}</a></li>`;
      });

    if (path !== '/') {
      const upDir = path.normalize(path.join(pathname, '..'));
      files.unshift(`<li><a href="${upDir}">..</a></li>`);
    }

    files.unshift('<ul>');
    files.push('</ul>');

    content = files.join('\n');
  } catch (e) {
    content = '<p>Nothing found!</p>';
  }

  const body = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Index of ${pathname}</title>
    </head>
    <style>
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 16px;
          font-size: 16px;
          font-family: Consolas, Menlo, Monaco, monospace;
          line-height: 1.5;
        }
        h1 {
          margin: 0;
          font-size: 1.25em;
        }
        ul {
          list-style: none;
          padding-left: 1em;
        }
        a, h1 {
          text-decoration: none;
          word-wrap: break-word;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </style>
    <body>
      <h1>Index of ${pathname}</h1>
      ${content}
    </body>
    </html>
  `;

  return body;
};

/**
 * return a function to execute when send hits a directory
 *
 * @param {Object} opts serv options
 * @param {Object} req http.ServerRequest
 */
const onSendDirectory = (opts, req) => {
  return async function onDirectory(res) {
    if (opts.listing) {
      sendResponse(res, await getListing(opts.root, req.pathname));
    } else {
      send404(res);
    }
  };
};

/**
 * return a function to execute when send fails
 *
 * @param {Object} res http.ServerResponse
 */
const onSendError = (res) => {
  return async function onError(e) {
    // send 404 for known errors
    if (e.code === 'ENOENT' || e.code === 'ENAMETOOLONG' || e.code === 'ENOTDIR') {
      return send404(res);
    }

    return send505(res);
  };
};

/**
 * return a http handler
 *
 * @param {string} root path to serve
 * @param {Object} options serv options
 */
const serveStatic = (root, options = {}) => {
  let opts = Object.assign({}, options);

  // setup options for send
  opts.maxage = opts.maxage || opts.maxAge || 0;
  opts.root = path.resolve(root);
  opts.index = ['index.html', 'index.htm'];

  return async function(req, res) {
    res.req = req;

    // no no for other type of requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD');
      res.setHeader('Content-Length', '0');
      return res.end();
    }

    const pathname = parseUrl(req).pathname || '/';

    try {
      // create send stream
      const stream = send(req, pathname, opts);

      // send listing or 404 on a directory
      stream.on('directory', onSendDirectory(opts, req));

      // fail on stream error
      stream.on('error', onSendError(res));

      // pipe
      stream.pipe(res);
    } catch (e) {
      send505(res);
    }
  };
};


module.exports = serveStatic;
