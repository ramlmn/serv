'use strict';

const path = require('path');
const http = require('http');
const https = require('https');
const http2 = require('http2');
const {promisify} = require('util');

const pem = require('pem');
const polka = require('polka');
const staticServe = require('./static-serve.js');
const compression = require('compression');
const getPort = require('get-port');

const addETag = require('./helpers/add-etag.js');
const httpsRedirect = require('./helpers/https-redirect.js');


const createCerts = promisify(pem.createCertificate);

// Options for pem to create certificates for development
const certificateOptions = {
  days: 7, // seems like a bare minimum
  selfSigned: true,
};


/**
 * A custom made development server
 *
 * @class Serv
 */
class Serv {
  constructor(options) {
    if (!options) {
      options = Serv.DEFAULT_OPTIONS;
    }

    this.opts = Object.assign({}, options);

    try {
      this.opts.port = Number.parseInt(this.opts.port, 10);
    } catch (e) {
      this.opts.port = null;
    }
  }

  /**
   * Start the server, returns an instance of (<HttpServer>|<Http2Server>|<HttpsServer>)
   *
   * @returns
   * @memberof Serv
   */
  async start() {
    const PORT = await getPort(this.opts.port);
    const HOST = '::';

    this.opts.port = PORT;
    this.opts.host = HOST;
    this.opts.dir = path.resolve(this.opts.dir);

    this.polkaApp = await this.createServer(this.opts);

    this.server = this.polkaApp.listen(PORT, HOST);

    let success = _ => {};
    let error = _ => {};

    return await new Promise((resolve, reject) => {
      success = _ => {
        resolve(this.server);
      };

      error = (e) => {
        reject(e);
      };

      this.server.on('error', error);
      this.server.on('listening', success);
    });
  }

  /**
   * Creates a instance of polka and configure it
   *
   * @param {Object} options Options for the server
   * @returns {Object}
   * @memberof Serv
   * @private
   */
  async createServer(options) {
    const polkaApp = await this.getPolkaApp(options);

    const staticAssetPath = path.resolve(options.dir);

    // A few settings for polka
    // disable etags, compression and logging in fast mode

    if (!options.fast) {
      // Enable SHA256 etags
      polkaApp.use(addETag);
    }

    if (options.compress && !options.fast) {
      // Enable compression
      polkaApp.use(compression());
    } else {
      options.compress = false;
    }

    if (options.secure) {
      // Upgrade all nonsecure requests
      polkaApp.use(httpsRedirect);
    } else {
      options.secure = false;
    }

    if (options.logger && !options.fast) {
      // Log the requests
      polkaApp.use(options.logger);
    }

    const staticHandler = staticServe(staticAssetPath, {
      dotfiles: 'allow',
      etag: false,
      listing: options.listing,
    });

    polkaApp.use(staticHandler);

    return polkaApp;
  }

  /**
   * Creates an express app by with http/https/http2
   *
   * @param {Object} options Options for the server
   * @returns {Object} (<HttpServer>|<Http2Server>|<HttpsServer>)
   * @memberof Serv
   * @private
   */
  async getPolkaApp(options) {
    const polkaApp = polka();

    // Generate self signed keys
    const {serviceKey, certificate} = await createCerts(certificateOptions);
    const SSLOptions = {
      key: serviceKey,
      cert: certificate,
    };

    // Overwrite the default listen method of polkaApp
    // Use it to create appropriate server (<HttpServer>|<Http2Server>|<HttpsServer>)
    polkaApp.listen = _ => {
      let server = null;

      const handler = polkaApp.handler.bind(polkaApp);

      if (options.secure) {
        if (options.http2) {
          server = http2.createSecureServer(SSLOptions, handler);
        } else {
          server = https.createServer(SSLOptions, handler);
        }
      } else {
        if (options.http2) {
          server = http2.createServer(handler);
        } else {
          server = http.createServer(handler);
        }
      }

      if (!server) {
        throw new Error('Failed to create a server for Polka');
      }

      polkaApp.server = server;

      return server.listen.apply(polkaApp.server, [options.port, options.host]);
    };

    return polkaApp;
  }

  async stop() {
    if (this.server && this.server.listening) {
      this.server.close();
    }
  }

  /**
   * Default options for the app
   *
   * @readonly
   * @memberof Serv
   */
  get DEFAULT_OPTIONS() {
    return {
      dir: '.',
      port: 8080,
      compress: true,
      secure: false,
      http2: false,
      listing: false,
    };
  };

  /**
   * options of app
   *
   * @readonly
   * @memberof Serv
   */
  get options() {
    return this.opts;
  }
}


module.exports = Serv;
