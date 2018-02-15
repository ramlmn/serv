#!/usr/bin/env node

'use strict';

const yargs = require('yargs');
const Serv = require('../lib/index.js');
const logger = require('../lib/helpers/logger.js');

const options = yargs
  .usage('Usage: $0 [...options]')
  .example('$0 --port 8080')
  .example('$0 -p 8182 -d dist -c')
  .example('$0 -p 8182 -d ../../my-other-project --compress')
  .help('help')
  .describe({
    'p': 'Port to listen on',
    'd': 'Directory to serve (relative)',
    'c': 'Enable compression',
    's': 'Use https - self signed keys',
    'h2': 'Enable http2 protocol',
    'l': 'Enable directory listing',
    'f': 'Enable fast mode(no compression, ETags, logging)',
  })
  .alias({
    'p': 'port',
    'd': 'dir',
    'c': 'compress',
    's': 'secure',
    'h2': 'http2',
    'l': 'listing',
    'f': 'fast',
  })
  .number(['p'])
  .boolean(['c', 's', 'h2', 'l', 'f'])
  .default({
    'p': 8080,
    'd': './',
    'c': true,
    's': false,
    'h2': false,
    'l': false,
    'f': false,
  })
  .argv;

options.logger = logger;

const staticServer = new Serv(options);

(async _ => {
  try {
    const server = await staticServer.start();
    const options = staticServer.options;

    if (options.compress) {
      console.info('[FLAG]', 'Compression enabled');
    }

    if (options.http2) {
      console.info('[FLAG]', 'HTTP/2 enabled');
    }

    if (options.secure) {
      console.info('[FLAG]', 'HTTPS enabled');
    }

    console.info('[INFO]', 'Serving directory', options.dir);
    console.info('[INFO]', 'Listening on port', options.port);

    if (server.listening) {
      console.info('[INFO]', 'Server started at', (new Date()).toISOString());
    } else {
      console.error('[FATAL]', 'Failed to start server', (new Date()).toISOString());
      process.exit();
    }
  } catch (err) {
    console.error('[FATAL]', err);
    process.exit();
  }
})();


if (process.platform === 'win32') {
  require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  }).on('SIGINT', _ => {
    process.emit('SIGINT');
  });
}

process.on('SIGINT', async _ => {
  console.log('\n[INFO]', 'Server stopped at', (new Date()).toISOString());
  await staticServer.stop();
  process.exit();
});

process.on('SIGTERM', async _ => {
  console.log('\n[INFO]', 'Server stopped at', (new Date()).toISOString());
  await staticServer.stop();
  process.exit();
});
