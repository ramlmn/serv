const fetch = require('node-fetch');
const getPort = require('get-port');
const {Agent: HTTPSAgent} = require('https');

const {createServer} = require('../lib/serv-utils.js');

const isCompressed = (res) => {
  return res.headers['Content-Encoding'] === 'gzip';
};

const isOK = (res) => {
  return res.status === 200;
};

module.exports.run = async (args, urlPath) => {
  const PORT = await getPort();

  const server = await createServer(args);

  try {
    await new Promise((resolve, reject) => {
      server.listen(PORT, '0.0.0.0', err => err ? reject() : resolve());
    });

    const p = `http${(args.secure || args.version === 2) ? 's' : ''}://localhost:${PORT}${urlPath}`;

    const fetchOpts = {};

    if (args.secure || args.version === 2) {
      // still no http2 testing
      fetchOpts.agent = new HTTPSAgent({
        rejectUnauthorized: false,
      });
    }

    const res = await fetch(p, fetchOpts);

    res.isCompressed = isCompressed(res);
    res.isOK = isOK(res);

    server.close();
    return res;
  } catch (e) {
    server.close();
    return {};
  }
};
