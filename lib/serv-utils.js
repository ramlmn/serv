const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const http2 = require('http2');
const {promisify} = require('util');
const compression = require('compression');

const staticHandler = require('./static-serv.js');

const compressionHandler = promisify(compression());

const binPath = path.resolve('./bin/');

/**
 * Return the type of http server required
 *
 * @param {onRequestHandler} handler request handle
 * @param {Object} opts
 * @return {Server|HTTP2Server|HTTP2SecureServer}
 */
const getHTTPServer = (handler, opts) => {
  if (opts.version === 2) {
    if (opts.ssl) {
      return http2.createSecureServer(opts, handler);
    } else {
      // this never happens
      return http2.createServer(handler);
    }
  }

  if (opts.ssl) {
    return https.createServer(opts, handler);
  }

  return http.createServer(handler);
};


/**
 * Get a function to handle requests
 *
 * @param {Object} opts
 * @return {Function}
 */
const getHandler = opts => {
  const reqHandler = staticHandler(opts);

  let handler = async (req, res) => {
    await reqHandler(req, res);
  };

  if (opts.compress) {
    handler = async (req, res) => {
      await compressionHandler(req, res);
      await reqHandler(req, res);
    };
  }

  return handler;
};


/**
 * Get server
 *
 * @param {Object} opts
 * @return {Promise<Server>|Promise<HTTP2Server>|Promise<HTTP2SecureServer>}
 */
module.exports.createServer = async opts => {
  let cert;
  let key;

  if (opts['ssl-cert'] && opts['ssl-key']) {
    // use certificate files
    cert = fs.readFileSync(args['ssl-cert']);
    key = fs.readFileSync(args['ssl-key']);
  } else {
    // use fallback certs
    // opts.ssl might be enabled due to http2
    cert = fs.readFileSync(path.join(binPath, 'local.cert'));
    key = fs.readFileSync(path.join(binPath, 'local.key'));
  }

  const handler = getHandler(opts);

  return getHTTPServer(handler, {cert, key, ssl: opts.ssl, httpVersion: opts.httpVersion});
};
