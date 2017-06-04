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
  })
  .alias({
    'p': 'port',
    'd': 'dir',
    'c': 'compress',
    'l': 'listing',
    'r': 'rewrite',
  })
  .number(['p'])
  .boolean(['c', 'l', 'r'])
  .default({'p': 5800, 'd': './', 'c': false, 'l': false, 'r': false})
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
const options = {
  dir: argv.dir,
  port: argv.port,
  compress: argv.compress,
  listing: argv.listing,
  rewrite: argv.rewrite,
  logger,
};

// Create new instance of serv
const staticServer = new Serv(options);

// Start the server
staticServer.start()
  .then(_ => {
    if (staticServer.options.compress) {
      console.log(chalk.yellow('[FLAG]'), 'Compression enabled');
    }

    if (staticServer.listing && !staticServer.rewrite) {
      console.log(chalk.yellow('[FLAG]'), 'Listing enabled');
    }

    if (!staticServer.listing && staticServer.rewrite) {
      console.log(chalk.yellow('[FLAG]'), 'Rewrite enabled');
    }

    console.log(chalk.green('[INFO]'), 'Serving directory',
      chalk.cyan(staticServer.options.dir));
    console.log(chalk.green('[INFO]'), 'Listening on port',
      chalk.cyan(staticServer.options.port));
    console.log(chalk.green('[INFO]'), 'Server started at',
      chalk.cyan((new Date()).toLocaleString()));
  })
  .catch(err => {
    console.error(chalk.red('[ERR!]'), err);
    process.exit(1);
  });
