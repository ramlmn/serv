'use strict';

const path = require('path');
const {promisify} = require('util');

const pem = require('pem');
const polka = require('polka');
const staticServe = require('./static-serve.js');
const compression = require('compression');
const getPort = require('get-port');

const hh2 = require('@ramlmn/hh2');

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
    this.opts = Object.assign({}, Serv.DEFAULTS, options || {});

    if (typeof this.opts.dir !== 'string') {
      throw new Error('option.dir is not a string');
    }

    if (this.opts.port && typeof this.opts.port !== 'number') {
      throw new Error('option.port is not a number');
    }

    this.opts.compress = Boolean(this.opts.compress);
    this.opts.secure = Boolean(this.opts.secure);
    this.opts.http2 = Boolean(this.opts.http2);
    this.opts.listing = Boolean(this.opts.listening);
    this.opts.fast = Boolean(this.opts.fast);

    if (this.opts.fast) {
      this.options.compress = false;
    }

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
    // get an available port
    const PORT = await getPort(this.opts.port);

    // listen on 0.0.0.0, allows external requests
    const HOST = '::';

    this.opts.port = PORT;
    this.opts.host = HOST;
    this.opts.dir = path.resolve(this.opts.dir);

    this.polkaApp = await this.createServer(this.opts);

    this.server = this.polkaApp.server;
    this.polkaApp.listen(PORT, HOST);

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

    if (options.compress && !options.http2) {
      // Enable compression
      // compression doesn't go well with http2
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

    // can override dotfiles, cannot override etags
    const handlerOpts = Object.assign({
      dotfile: 'allow',
    }, this.opts, {
      etag: false,
      listing: options.listing,
    });

    const staticHandler = staticServe(staticAssetPath, handlerOpts);

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

    const opts = Object.assign({}, SSLOptions);

    opts.secure = options.secure;

    if (options.http2) {
      opts.type = 'http2';
    } else {
      opts.type = 'http';
    }

    const handler = polkaApp.handler.bind(polkaApp);
    const server = hh2(handler, opts);

    polkaApp.server = server;

    return polkaApp;
  }

  /**
   * Stop this serv instance
   */
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
  get DEFAULTS() {
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
    // return a copy only
    return Object.assign({}, this.opts);
  }
}


module.exports = Serv;
