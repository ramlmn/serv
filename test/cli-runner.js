const {spawn} = require('child_process');
const path = require('path');
const {getOpts, fetchResponse} = require('./runner.js');

const cliPath = path.resolve(`./test/cli/serv.${process.platform === 'win32' ? 'cmd' : 'sh'}`);

const delay = time => {
  return new Promise(resolve => {
    setTimeout(resolve, time);
  });
};

const spawnProcess = (flags) => {
  return new Promise((resolve, reject) => {
    const app = spawn(
      cliPath,
      [...flags],
      {stdio: 'ignore', env: process.env}
    );
    resolve(app);
  });
};

const testCli = async (opts, PORT, urlPath) => {
  opts = getOpts(opts);

  // convert to cli flags
  const flags = Object.keys(opts).reduce((acc, k) => {
    acc.push(`--${k}`, opts[k]);
    return acc;
  }, []);

  const app = await spawnProcess(flags);
  await delay(1000);
  let res = {};
  let err = null;

  try {
    res = await fetchResponse(opts, PORT, urlPath);
  } catch (e) {
    err = e;
  } finally {
    await delay(1000);
    app.kill();
  }

  return [err, res];
};

module.exports = {
  testCli,
};
