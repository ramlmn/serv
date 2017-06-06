'use strict';

const path = require('path');
const http = require('http');
const pem = require('pem');
const spdy = require('spdy');
const utils = require('./utils');
const staticHandler = require('./static');


/**
 * Used to start a static server
 *
 * @class Serv
 */
class Serv {
  constructor(options = {} ) {
    this.options = options;
  }

  /**
   * Start a server, first start by creating it and then start it,
   * fail when cannot create server or when server fails to start
   *
   * @param {any} [dynOptions=null] Options can be specified during start also
   * @returns {Promise}
   *
   * @memberof Serv
   */
  start(dynOptions = null) {
    // Check if server is already running or not
    if (this._server && this._server.listening) {
      this.stop();
    }

    // Options can be specified dynamically
    const options = !dynOptions ? this.options : dynOptions;
    return new Promise((resolve, reject) => {
      // First create the server, and then start it
      this._createServer(options)
        .then(_ => {
          this._server.listen(options.port, Serv.LOCAL_IP, error => {
            if (error) {
              // If server has an error, then reject with that error
              reject(error);
            } else {
              // Server started succesfully
              resolve();
            }
          });
        })
        .catch(error => reject(error));
    });
  }


  /**
   * Create server based on options
   *
   * @param {any} [options={}]
   * @returns {Promise}
   *
   * @memberof Serv
   */
  _createServer(options = {}) {
    return new Promise((resolve, reject) => {
      this.options = Object.assign({}, Serv.DEFAULTS, options);

      // User has to provide an ephemeral port
      if (!Serv.checkPortValidity(this.options.port)) {
        // Nah, cannot allow to use that port
        throw new Error('Provide an ephemeral port (1024 - 65535)!');
      }

      // Check if the relative path provided is a real directory
      if (!utils.dirExists(this.options.dir)) {
        throw new Error(`Cannot access the provided path!, ${this.options.dir}`);
      }

      // Rewrites and Listing don't go along with each other
      if (this.options.listing && this.options.rewrite) {
        // Crazy, told you not to use those along with each other
        throw new Error('Rewrites and Listing don\'t go along together!');
      }

      this._resolvedPath = path.resolve(this.options.dir);
      this.options.dir = this._resolvedPath;

      if (this.options.secure === true || this.options.http2 === true) {
        pem.createCertificate({days: 1, selfSigned: true}, (error, keys) => {
          if (error) {
            return reject(error);
          }

          const spdyOptions = {
            key: keys.serviceKey,
            cert: keys.certificate,
            spdy: {
              protocols: ['http/1.1'],
              plain: false,
            },
          };

          if (this.options.http2 === true) {
            // unshift is a thing
            spdyOptions.spdy.protocols.unshift('h2');
          }

          this._server = spdy.createServer(spdyOptions, staticHandler(this.options));
          return resolve(this);
        });
      } else {
        this._server = http.createServer(staticHandler(this.options));
        return resolve(this);
      }
    });
  }

  /**
   * Stop the server
   *
   * @memberof Serv
   */
  stop() {
    this._server.close();
  }

  static checkPortValidity(port) {
    if (port < 1024 || port > 65535) {
      return false;
    } else {
      return true;
    }
  }

  static get LOCAL_IP() {
    return '0.0.0.0';
  }

  static get DEFAULTS() {
    return {
      dir: '.',
      port: 8080,
      compress: false,
      listing: false,
      rewrite: false,
      logger: _ => {},
    };
  }
}

module.exports = Serv;
