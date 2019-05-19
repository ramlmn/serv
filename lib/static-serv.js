const path = require('path');
const {URL} = require('url');
const {promisify} = require('util');
const {stat: fsStat, createReadStream} = require('fs');

const etag = require('etag');
const mime = require('mime/index.js');
const parseRange = require('range-parser');

const {isFresh, preFail, renderDir} = require('./http-utils.js');

// simple parser, base is required for constructor
const parseUrl = s => new URL(s, 'http://domain.io');
const stat = promisify(fsStat);

// some globals
const encoding = 'utf-8';
const staticCache = 'public, max-age=31536000';
const noCache = 'no-cache';


const send404 = (req, res) => {
  res.writeHead(404, {
    'Content-Type': mime.getType('404.html'),
    'Cache-Control': noCache,
  });
  res.end(`<em><code>${req.pathname}</code></em> not found`, encoding);
};


const send500 = (req, res) => {
  res.getHeaderNames().forEach(res.removeHeader);
  res.writeHead(500, {
    'Content-Type': mime.getType('500.html'),
    'Cache-Control': noCache,
  });
  res.end('500 Internal Error', encoding);
};

/**
 * Returns a middleware for serving static files
 *
 * @param {Object} opts
 * @return {Function}
 */
const staticHandler = opts => {
  const staticDir = opts.dir || './';
  const listing = opts.listing;

  // return handler
  return (async function servHandler(req, res) {
    req.pathname = decodeURIComponent(parseUrl(req.url).pathname);

    // serve static files
    let filePath = path.join(staticDir, req.pathname);

    try {
      // stat files
      let stats = await stat(filePath);

      // oops, maybe some dir named 'dir.ext'
      if (stats.isDirectory()) {
        // try to serve index file
        try {
          const newPath = path.join(filePath, 'index.html');
          // update stats and path
          stats = await stat(newPath);
          filePath = newPath;
        } catch (err) {
          // index doesn't exist, check listing
          if (!listing) {
            send404(req, res);
            return true;
          }

          // send the listing
          const body = await renderDir(req, filePath);
          res.writeHead(200, {
            'Content-Length': body.length,
            'Content-Type': mime.getType('listing.html'),
            'Cache-Control': noCache,
          });
          res.end(body);
          return true;
        }
      }

      // send the requested file
      const headers = {};
      headers['ETag'] = etag(stats);
      headers['Last-Modified'] = stats.mtime;
      headers['Content-Length'] = stats.size;
      headers['Content-Type'] = mime.getType(filePath);
      headers['Cache-Control'] = staticCache;

      if (isFresh(req, headers)) {
        // not-modified
        res.writeHead(304, headers);
        res.end('', encoding);
        return true;
      }

      if (preFail(req, res)) {
        // prefail on conditional GET
        res.writeHead(412, headers);
        res.end('', encoding);
        return true;
      }

      if (req.method === 'HEAD') {
        res.writeHead(200, headers);
        res.end('', encoding);
        return true;
      }

      const streamOpts = {};

      if (req.headers.range && stats.size) {
        const range = parseRange(stats.size, req.headers.range);

        if (typeof range === 'object' && range.type === 'bytes') {
          const {start, end} = range[0];
          streamOpts.start = start;
          streamOpts.end = end;
          res.statusCode = 206; // Partial Content
        } else {
          headers['Content-Range'] = `bytes */${stats.size}`;
          res.statusCode = 416; // Requested Range Not Satisfiable
        }
      }

      if (streamOpts.start !== undefined && streamOpts.end !== undefined) {
        headers['Content-Range'] = `bytes ${streamOpts.start}-${streamOpts.end}/${stats.size}`;
        headers['Content-Length'] = streamOpts.end - streamOpts.start + 1;
      }

      // remove empty headers
      Object.keys(headers).forEach(k => headers[k] || delete headers[k]);
      // write head
      res.writeHead(res.statusCode || 200, headers);
      // send stream response
      createReadStream(filePath, streamOpts).pipe(res);
    } catch (err) {
      // no file found vs arbitrary error
      if (err.code === 'ENOENT') {
        send404(req, res);
      } else {
        console.error(err);
        send500(req, res);
      }
    }

    // async
    return true;
  });
};

module.exports = staticHandler;
