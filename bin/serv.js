#!/usr/bin/env node

'use strict';

const yargs = require('yargs');
const chalk = require('chalk');
const Serv = require('../lib/serv.js');

const argv = yargs
  .usage('Usage: $0 [...options]')
  .example('$0 --port 8080')
  .example('$0 -p 8182 -d dist -c')
  .example('$0 --port 8181 --dir ./share --listing')
  .example('$0 -p 8182 -d ../../my-other-project --compress')
  .help('help')
  .describe({
    'p': 'Port to listen on',
    'd': 'Directory to serve (relative)',
    'c': 'Enable compression',
    'l': 'Enable dir listing (not with -r)',
    'r': 'Rewrite to root (not with -l)',
    's': 'Use https',
    'h2': 'Enable http2 protocol',
  })
  .alias({
    'p': 'port',
    'd': 'dir',
    'c': 'compress',
    'l': 'listing',
    'r': 'rewrite',
    's': 'secure',
    'h2': 'http2',
  })
  .number(['p'])
  .boolean(['c', 'l', 'r', 's', 'h2'])
  .default({
    'p': 8080,
    'd': './',
    'c': false,
    'l': false,
    'r': false,
    's': false,
    'h2': false,
  })
  .argv;


/**
 * Logs requests
 *
 * @param {Object} request http request object
 * @param {Object} response http response object
 */
function logger(request, response) {
  console.log(chalk.yellow('[LOG]'), chalk.magenta((new Date()).toLocaleTimeString()),
    chalk.cyan(response.statusCode), '->', chalk.magenta(request.method), request.url);
};

// Options for server
const options = Object.assign({logger}, argv);

// Create new instance of serv
const staticServer = new Serv(options);

// Start the server
(async _ => {
  try {
    await staticServer.start();

    const status = staticServer.status;
    if (status.options.compress) {
      console.log(chalk.yellow('[FLG]'), 'Compression enabled');
    }

    if (status.options.http2) {
      console.log(chalk.yellow('[FLG]'), 'HTTP/2 enabled');
    } else if (status.options.secure) {
      console.log(chalk.yellow('[FLG]'), 'HTTPS enabled');
    }

    if (status.options.listing) {
      console.log(chalk.yellow('[FLG]'), 'Listing enabled');
    } else if (status.options.rewrite) {
      console.log(chalk.yellow('[FLG]'), 'Rewrite enabled');
    }

    console.log(chalk.green('[INF]'), 'Serving directory', chalk.cyan(status.options.dir));
    console.log(chalk.green('[INF]'), 'Listening on port', chalk.cyan(status.options.port));

    if (status.listening) {
      console.log(chalk.green('[INF]'), 'Server started at',
        chalk.cyan(new Date().toLocaleString()));
    } else {
      console.log(chalk.red('[ERR]'), 'Failed to start server',
        chalk.cyan(new Date().toLocaleString()));
      process.exit(1);
    }
  } catch (err) {
    console.error(chalk.red('[ERR]'), err);
    process.exit(1);
  }
})();
