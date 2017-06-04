'use strict';

const path = require('path');
const http = require('http');
const utils = require('./utils');
const staticHandler = require('./static');


/**
 * Used to start a static server
 *
 * @class Serv
 */
class Serv {
  constructor(options = {}) {
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
    this._server = http.createServer(staticHandler(this.options));
  }

  /**
   * Start the server, resolves when the server starts,
   * rejects if server fails to start
   *
   * @returns {Promise}
   *
   * @memberof Serv
   */
  start() {
    // Start the server
    return new Promise((resolve, reject) => {
      this._server.listen(this.options.port, Serv.LOCAL_IP, error => {
        if (error) {
          // If server has an error, then reject with that error
          reject(error);
        } else {
          // Server started succesfully
          resolve();
        }
      });
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
