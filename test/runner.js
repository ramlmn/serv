const fetch = require('node-fetch');
const getPort = require('get-port');
const {Agent: HTTPSAgent} = require('https');

const {createServer} = require('../lib/serv-utils.js');

const getOpts = opts => {
  opts = Object.assign({}, {
    dir: 'test/samples/',
  }, opts);

  if (opts.http2) {
    opts.httpVersion = 2;
    opts.ssl = true;
  } else {
    opts.httpVersion = 1;
  }

  if (opts.ssl || opts['self-signed'] || (opts['ssl-cert'] && opts['ssl-key'])) {
    opts.ssl = true;
  }

  return opts;
};

module.exports.run = async (args, urlPath) => {
  args = getOpts(args);

  const PORT = await getPort();
  const server = await createServer(args);

  await new Promise((resolve, reject) => {
    server.listen(PORT, '0.0.0.0', err => err ? reject() : resolve());
  });

  const p = `http${(args.ssl || args.version === 2) ? 's' : ''}://127.0.0.1:${PORT}${urlPath}`;

  const fetchOpts = Object.assign({}, args.fetchOpts);

  if (args.ssl || args.version === 2) {
    // still no http2 testing
    fetchOpts.agent = new HTTPSAgent({
      rejectUnauthorized: false,
    });
  }

  const res = await fetch(p, fetchOpts);

  server.close();
  return res;
};
