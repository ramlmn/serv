const path = require('path');
const {URL} = require('url');
const {promisify} = require('util');
const {stat: fsStat, createReadStream} = require('fs');

const etag = require('etag');
const mime = require('mime/index.js');

const {isFresh, preFail, renderDir} = require('./http-utils.js');

// simple parser, base is required for constructor
const parseUrl = s => new URL(s, 'http://domain.io');
const stat = promisify(fsStat);

// some globals
const encoding = 'utf-8';
const staticCache = 'public, max-age=31536000';
const noCache = 'public, no-cache, no-store, must-revalidate';


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
  const staticDir = path.join('.', opts.dir || '');
  const listing = opts.listing || true;

  // return handler
  return (async function servHandler(req, res) {
    req.pathname = decodeURIComponent(parseUrl(req.url).pathname);

    const {ext, name} = path.parse(req.pathname);
    const isDotfile = name.startsWith('.');
    const looksDir = !isDotfile && !ext;

    try {
      // serve static files
      let filePath = path.resolve(path.join(staticDir, req.pathname));

      const servDir = async _ => {
        // try to serve index file
        try {
          const newPath = path.join(filePath, 'index.html');
          stats = await stat(newPath);
          filePath = newPath;
        } catch (err) {
          // send the list
          try {
            const body = await renderDir(req, filePath);
            res.writeHead(200, {
              'Content-Lenght': body.length,
              'Content-Type': mime.getType('listing.html'),
              'Cache-Control': noCache,
            });
            res.end(body);
          } catch (err) {
            // dir doesn't exist
            send404(req, res);
          }
        }
      };

      // stat files
      let stats = await stat(filePath);

      // oops, maybe some dir named 'dir.ext'
      if (stats.isDirectory()) {
        if (!listing) {
          // check listing
          send404(req, res);
          return true;
        }

        // fix trailing slashes, handle as there exists a trailing slash
        if (!req.pathname.endsWith('/')) {
          req.pathname = `${req.pathname}${looksDir ? '/' : ''}`;
        }

        await servDir();
        return true;
      }

      // send the requested file
      const headers = {};
      headers['Etag'] = etag(stats);
      headers['Last-Modified'] = stats.mtime;
      headers['Content-Length'] = stats.size;
      headers['Content-Type'] = mime.getType(filePath);
      headers['Cache-Control'] = staticCache;

      if (isFresh(req, res, stats)) {
        // not-modified
        response.writeHead(304, headers);
        res.end('', encoding);
        return true;
      }

      if (preFail(req, res)) {
        // prefail on conditional GET
        response.writeHead(412, headers);
        res.end('', encoding);
        return true;
      }

      if (req.method === 'HEAD') {
        response.writeHead(200, headers);
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

          res.statusCode = 206;
        } else {
          res.statusCode = 416;
          headers['Content-Range'] = `bytes */${stats.size}`;
        }
      }

      if (streamOpts.start !== undefined && streamOpts.end !== undefined) {
        headers['Content-Range'] = `bytes ${streamOpts.start}-${streamOpts.end}/${stats.size}`;
        headers['Content-Length'] = streamOpts.end - streamOpts.start + 1;
      }

      // finally do stuff
      Object.keys(headers).forEach(k => headers[k] || delete headers[k]);
      res.writeHead(res.statusCode || 200, headers);
      createReadStream(filePath, streamOpts).pipe(res);
    } catch (err) {
      // no file found vs arbitrary error
      if (err.code === 'ENOENT') {
        send404(req, res);
      } else {
        send500(req, res);
      }
    }

    // async
    return true;
  });
};

module.exports = staticHandler;
