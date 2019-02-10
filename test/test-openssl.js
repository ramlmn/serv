const tape = require('tape');
const runner = require('./runner.js');

tape('notfound openssl', async t => {
  t.plan(1);

  // remove the environment variable
  const binPath = process.env.OPENSSL_BIN;
  const cnfPath = process.env.OPENSSL_CONF;
  delete process.env.OPENSSL_BIN;
  // delete process.env.OPENSSL_CONF;

  try {
    // run, this should throw
    await runner.run({
      dir: 'test/samples/',
      listing: false,
      secure: true,
      version: 1,
      compress: false,
    }, '/emoji.json');

    // reset back
    process.env.OPENSSL_CONF = cnfPath;
    process.env.OPENSSL_BIN = binPath;
    t.fail('not throws');
  } catch (e) {
    // reset back
    process.env.OPENSSL_CONF = cnfPath;
    process.env.OPENSSL_BIN = binPath;
    t.pass('throws fine', e);
  }
});

tape('notfound openssl for HTTP2', async t => {
  t.plan(1);

  // remove the environment variable
  const binPath = process.env.OPENSSL_BIN;
  const cnfPath = process.env.OPENSSL_CONF;
  delete process.env.OPENSSL_BIN;
  // delete process.env.OPENSSL_CONF;

  try {
    // run, this should throw
    await runner.run({
      dir: 'test/samples/',
      listing: false,
      secure: false,
      version: 2,
      compress: false,
    }, '/emoji.json');

    // reset back
    process.env.OPENSSL_CONF = cnfPath;
    process.env.OPENSSL_BIN = binPath;
    t.fail('not throws');
  } catch (e) {
    // reset back
    process.env.OPENSSL_CONF = cnfPath;
    process.env.OPENSSL_BIN = binPath;
    t.pass('throws fine', e);
  }
});
