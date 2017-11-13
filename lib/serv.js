'use strict';

const path = require('path');
const http = require('http');
const pem = require('pem');
const spdy = require('spdy');
const utils = require('./utils.js');
const {promisify} = require('util');
const staticHandler = require('./static.js');

const createCerts = promisify(pem.createCertificate);


/**
 * Used to start a static server
 *
 * @class Serv
 */
class Serv {
  /**
   * Creates an instance of Serv
   * @param {Object} [options={}]
   * @memberof Serv
   */
  constructor(options = {}) {
    this._options = options;
  }

  /**
   * Start a server, first start by creating it and then start it,
   * fail when cannot create server or when server fails to start
   *
   * @param {Object} [dynOptions=null] Options can be specified during start also
   * @returns {Promise}
   * @memberof Serv
   */
  async start(dynOptions = null) {
    // Check if server is already running or not
    if (this._server && this._server.listening) {
      this.stop();
    }

    // Options can be specified dynamically
    const options = !dynOptions ? this._options: dynOptions;
    return new Promise(async (resolve, reject) => {
      // First create the server, and then start it
      try {
        await this._createServer(options);
        this._server.listen(options.port, Serv.LOCAL_IP, error => {
          if (error) {
            // If server has an error, then reject with that error
            reject(error);
          } else {
            // Server started succesfully
            resolve(this.status);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }


  /**
   * Create server based on options
   *
   * @param {Object} [options={}]
   * @returns {Promise}
   * @memberof Serv
   */
  async _createServer(options = {}) {
    return new Promise(async (resolve, reject) => {
      this._options = Object.assign({}, Serv.DEFAULTS, options);

      // User has to provide an ephemeral port
      if (!Serv.isValidPort(this._options.port)) {
        // Nah, cannot allow to use that port
        reject(new Error('Provide an ephemeral port (1024 - 65535)!'));
        return;
      }

      // Check if the relative path provided is a real directory
      if (!(await utils.stat(this._options.dir)).isDir) {
        reject(new Error(`Cannot access the provided path!, ${this._options.dir}`));
        return;
      }

      // Rewrites and Listing don't go along with each other
      if (this._options.listing && this._options.rewrite) {
        // Crazy!, told you not to use those along with each other
        reject(new Error('Rewrites and Listing don\'t go along together!'));
        return;
      }

      this._options.dir = path.resolve(this._options.dir);

      if (this._options.secure === true || this._options.http2 === true) {
        try {
          const sscopts = {
            days: 7,
            selfSigned: true,
          };

          const certs = await createCerts(sscopts);

          const spdyOptions = {
            key: certs.serviceKey,
            cert: certs.certificate,
            spdy: {
              protocols: ['http/1.1'],
              plain: false,
            },
          };

          if (this._options.http2 === true) {
            spdyOptions.spdy.protocols.unshift('h2');
          }

          this._server = spdy.createServer(spdyOptions, staticHandler(this._options));
          resolve(this);
        } catch (err) {
          reject(err);
        }
      } else {
        this._server = http.createServer(staticHandler(this._options));
        resolve(this);
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

  /**
   * Status of the server with options
   *
   * @readonly
   * @returns {Object}
   * @memberof Serv
   */
  get status() {
    return {
      listening: this._server.listening,
      options: this._options,
    };
  }

  /**
   * Checks if a port is valid to be used for dev environment
   *
   * @static
   * @param {number} port
   * @returns {boolean}
   * @memberof Serv
   */
  static isValidPort(port) {
    if (port < 1024 || port > 65535) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Local system address
   *
   * @readonly
   * @static
   * @returns {string}
   * @memberof Serv
   */
  static get LOCAL_IP() {
    return '0.0.0.0';
  }

  /**
   * Default options for serv
   *
   * @readonly
   * @static
   * @returns {Object}
   * @memberof Serv
   */
  static get DEFAULTS() {
    return {
      dir: '.',
      port: 8080,
      compress: true,
      listing: false,
      rewrite: false,
      logger: _ => {},
    };
  }
}

module.exports = Serv;
