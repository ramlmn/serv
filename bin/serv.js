#!/usr/bin/env node

const arg = require('arg');
const getPort = require('get-port');
const {magenta, cyan, underline} = require('kleur');

const {createServer} = require('../lib/serv-utils.js');

const rawArgs = arg({
    '--help': Boolean,
    '--version': Boolean,
    '--port': Number,
    '--dir': String,
    '--listing': Boolean,
    '--secure': Boolean,
    '--http2': Boolean,
    '--compress': Boolean,

    '-h': '--help',
    '-v': '--version',
    '-p': '--port',
    '-d': '--dir',
    '-l': '--listing',
    '-s': '--secure',
    '-c': '--compress',
  }, {
    argv: process.argv.slice(2),
  });

// remove '--' at the beginning
const args = Object.keys(rawArgs).reduce((acc, key) => {
    acc[key.replace('--', '')] = rawArgs[key];
    return acc;
  }, {});


// set http version
if (args.http2) {
  args.version = 2;
  args.secure = true;
} else {
  arg.version = 1;
}

const registerShutdown = fn => {
  let run = false;

  const wrapper = _ => {
    if (!run) {
      run = true;
      fn();
    }
  };

  process.on('SIGINT', wrapper);
  process.on('SIGTERM', wrapper);
  process.on('exit', wrapper);
};


(async _ => {
  const PORT = await getPort({port: args.port || undefined});

  const server = await createServer(args);

  server.listen(PORT, '0.0.0.0', _ => {
    let address = server.address();

    registerShutdown(_ => server.close());

    if (args.port && args.port !== PORT) {
      console.log(`${magenta('INFO:')} using ${bold(PORT)} instead of ${bold(args.port)}`);
    }

    if (typeof address !== 'string') {
      address = `${address.address}:${address.port}`;
    }

    console.log(cyan(`> Listening on ${address}`));
    console.log(
      cyan('> Open'),
      underline(`http${(args.secure || args.version === 2) ? 's' : ''}://localhost:${PORT}`)
    );
  });

  process.on('SIGINT', _ => {
    console.log(magenta('Terminating...'));
    process.exit(0);
  });
})().catch(err => {
  console.error(magenta(err.message));
  process.exit(1);
});
