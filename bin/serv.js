#!/usr/bin/env node

const arg = require('arg');
const getPort = require('get-port');
const {magenta, cyan, underline, bold} = require('kleur');

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

if (args.version) {
  console.log(`v${require('../package.json').version}`);
  process.exit(0);
}

if (args.help) {
  console.log(`
  serv - ${require('../package.json').description}

  Usage
    Serve current directory

      $ serv

    Listen on port 8080 with compression

      $ serv --port 8080 --compress -d ./site/

    Enable https with directory listing

      $ serv --secure --listing

  Options
    -h, --help         Shows this help text
    -p, --port         Port to listen on (default 5000)
    -d, --dir          Path to directory
    -l, --listing      Enable directory listing
    -s, --secure       Enables SSL flag (https)
    -2, --http2        Enables http2 flag
    -c, --compress     Enables compression (gzip)
  `);
  process.exit(0);
}


// set http version
if (args.http2) {
  args.version = 2;
  args.secure = true;
} else {
  arg.version = 1;
}


(async _ => {
  const PORT = await getPort({port: args.port || undefined});

  const server = await createServer(args);

  server.listen(PORT, '0.0.0.0', _ => {
    let address = server.address();


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

  process.on('exit', server.close);
  process.on('SIGTERM', server.close);
  process.on('SIGINT', _ => {
    console.log(magenta('Terminating...'));
    server.close();
    process.exit(0);
  });
})().catch(err => {
  console.error(magenta(err.message));
  process.exit(1);
});
