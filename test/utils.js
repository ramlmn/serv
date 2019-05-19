const {Agent: HTTPSAgent} = require('https');
const fetch = require('node-fetch');

const getOpts = opts => {
  opts = Object.assign({}, {
    dir: './test/samples/',
  }, opts);

  if (opts.http2) {
    opts.httpVersion = 2;
    opts.ssl = true;
  } else {
    opts.httpVersion = 1;
  }

  if (opts['self-signed'] || (opts['ssl-cert'] && opts['ssl-key'])) {
    opts.ssl = true;
  }

  return opts;
};

const fetchResponse = async (args, PORT, urlPath) => {
  const p = `http${args.ssl ? 's' : ''}://127.0.0.1:${PORT}${urlPath}`;

  const fetchOpts = Object.assign({}, args.fetchOpts);

  if (args.ssl) {
    // still no http2 testing
    fetchOpts.agent = new HTTPSAgent({
      rejectUnauthorized: false,
    });
  }

  return await fetch(p, fetchOpts);
};


module.exports = {
  getOpts,
  fetchResponse,
};
