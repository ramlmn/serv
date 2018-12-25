#!/usr/bin/env node

const {promisify} = require('util');

const arg = require('arg');
const pem = require('pem');
const getPort = require('get-port');
const hh2 = require('@ramlmn/hh2');
const compression = require('compression');
const {magenta, cyan, red, bold} = require('kleur');

const staticHandler = require('../lib/static-serv.js');

const compressionHandler = promisify(compression());
const createCertificates = promisify(pem.createCertificate);

const rawArgs = arg({
    '--help': Boolean,
    '--version': Boolean,
    '--port': Number,
    '--dir': String,
    '--listing': Boolean,
    '--https': Boolean,
    '--http2': Boolean,
    '--secure': Boolean,
    '--compress': Boolean,

    '-h': '--help',
    '-v': '--version',
    '-p': '--port',
    '-d': '--dir',
    '-l': '--listing',
    '-s': '--secure',
    '-2': '--http2',
    '-c': '--compress',
  }, {
    permissive: true,
    argv: process.argv.slice(2),
  });

// remove '--' at the beginning
const args = Object.keys(rawArgs).reduce((acc, key) => {
    acc[key.replace('--', '')] = rawArgs[key];
    return acc;
  }, {});


const getHandler = args => {
  const reqHandler = staticHandler(args);

  let handler = async (req, res) => {
    await reqHandler(req, res);
  };

  if (args.compress) {
    handler = async (req, res) => {
      await compressionHandler(req, res);
      await reqHandler(req, res);
    };
  }

  return handler;
};

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

  const {
    certificate: cert,
    serviceKey: key,
  } = await createCertificates({selfSigned: true, days: 7});

  const handler = getHandler(args);

  const server = hh2(handler, {cert, key, secure: args.secure, h2: args.http2});

  server.listen(PORT, '0.0.0.0', _ => {
    const address = server.address();

    registerShutdown(_ => server.close());

    if (args.port && args.port !== PORT) {
      console.log(`${cyan('INFO:')} using ${bold(PORT)} instead of ${bold(args.port)}`);
    }

    if (typeof address === 'string') {
      console.log(magenta(`Listening on ${address}`));
    } else {
      console.log(magenta(`Listening on ${address.address}:${address.port}`));
    }
  });

  process.on('SIGINT', _ => {
    console.log(red('Force-closing all open sockets...'));
    process.exit(0);
  });
})();
