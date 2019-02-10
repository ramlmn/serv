const http = require('http');
const https = require('https');
const http2 = require('http2');
const {promisify} = require('util');
const pem = require('pem');
const compression = require('compression');

const staticHandler = require('./static-serv.js');

const compressionHandler = promisify(compression());
const createCertificates = promisify(pem.createCertificate);


const getHTTPServer = (handler, opts) => {
  if (opts.version === 2) {
    if (opts.secure) {
      return http2.createSecureServer(opts, handler);
    } else {
      return http2.createServer(handler);
    }
  } else if (opts.secure) {
    return https.createServer(opts, handler);
  }

  return http.createServer(handler);
};

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

module.exports.createServer = async opts => {
  let cert;
  let key;

  if (opts.secure || opts.version === 2) {
    const certs = await createCertificates({selfSigned: true, days: 7});
    cert = certs.certificate;
    key = certs.serviceKey;
  }

  const handler = getHandler(opts);

  return getHTTPServer(handler, {cert, key, secure: opts.secure, version: opts.version});
};
