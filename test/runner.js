const getPort = require('get-port');

const {createServer} = require('../lib/serv-utils.js');
const {getOpts, fetchResponse} = require('./utils.js');

const run = async (args, urlPath) => {
  args = getOpts(args);

  const PORT = await getPort();
  const server = await createServer(args);

  await new Promise((resolve, reject) => {
    server.listen(PORT, '0.0.0.0', err => err ? reject() : resolve());
  });

  const res = await fetchResponse(args, PORT, urlPath);

  server.close();
  return res;
};

module.exports = {
  fetchResponse,
  run,
  getOpts,
};
