#!/usr/bin/env node

const arg = require('arg');
const getPort = require('get-port');
const {magenta, cyan, underline, bold} = require('kleur');

const pkg = require('../package.json');
const {createServer} = require('../lib/serv-utils.js');

const rawArgs = arg({
    '--help': Boolean,
    '--version': Boolean,
    '--host': String,
    '--port': Number,
    '--dir': String,
    '--listing': Boolean,
    '--compress': Boolean,
    '--ssl': Boolean,
    '--ssl-cert': String,
    '--ssl-key': String,
    '--http2': Boolean,
    '--httpVersion': Number,

    '-h': '--help',
    '-v': '--version',
    '-p': '--port',
    '-d': '--dir',
    '-l': '--listing',
    '-c': '--compress',
    '-s': '--ssl',
  }, {
    argv: process.argv.slice(2),
  });

// remove '--' at the beginning
const args = Object.keys(rawArgs).reduce((acc, key) => {
    acc[key.replace('--', '')] = rawArgs[key];
    return acc;
  }, {});

if (args.version) {
  console.log(`v${pkg.version}`);
  process.exit(0);
}

if (args.help) {
  console.log(`
  serv - ${pkg.description}

  Usage
    Serve current directory

      $ serv

    Listen on port 8080 with compression

      $ serv --port 8080 --compress -d ./site/

    Listen over https with directory listing (uses self-signed certificates)

      $ serv --self-signed --listing

    Use specific SSL certificate and private key

      $ serv --ssl-cert ./cred.cert --ssl-key ./cred.key

  Options
    -h, --help             Shows this help text
    --host                 Host to listen on (default "0.0.0.0")
    -p, --port             Port to listen on (default $PORT or 5000)
    -d, --dir              Path to directory
    -l, --listing          Enable directory listing
    -c, --compress         Enables compression (gzip)
    -s, --ssl              Use self-signed certificates (enables TLS/SSL)
    --ssl-cert             Path to SSL certificate file (enables TLS/SSL)
    --ssl-key              Path to SSL private key file (enables TLS/SSL)
    --http2                Use http2 (enables TLS/SSL)
  `);
  process.exit(0);
}


// set http version
if (args.http2) {
  args.httpVersion = 2;
  args.ssl = true;
} else {
  args.httpVersion = 1;
}

// enable ssl flag when certificate id provided
if (args['ssl-cert'] && args['ssl-key']) {
  args.ssl = true;
}

// get deault port from environment or else fallback
args.port = Number.parseInt(args.port || (process.env.PORT || 5000), 10);
args.host = args.host || "0.0.0.0";


(async _ => {
  const PORT = await getPort({port: args.port});

  const server = await createServer(args);

  const closeServer = _ => {
    server.close(err => {
      if (err) {
        console.error(err);
        process.exitCode = 1;
      }
      process.exit();
    });
  };

  server.listen(PORT, args.host, _ => {
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
      underline(`http${(args.ssl) ? 's' : ''}://localhost:${PORT}`)
    );
  });

  process.on('SIGTERM', closeServer);
  process.on('SIGINT', closeServer);
})().catch(err => {
  console.error(magenta(err.message));
  process.exit(1);
});
