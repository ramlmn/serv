const tape = require('tape');
const runner = require('./runner.js');

const argsTemplate = {
  dir: 'test/samples/',
  listing: false,
  secure: false,
  version: 1,
  compress: false,
};

tape('http test', async t => {
  t.plan(1);

  try {
    const res = await runner.run(argsTemplate, '/emoji.json');

    const data = await res.json();

    if (data['ok'] === '\u2714') {
      t.pass(`got valid response, status: ${res.status}`);
    } else {
      t.fail(`got invalid JSON response, status: ${res.status}`);
    }
  } catch (e) {
    t.fail('Failed: ', e);
  }
});

tape('https test', async t => {
  t.plan(1);

  try {
    const res = await runner.run(Object.assign({}, argsTemplate, {secure: true}), '/emoji.json');

    const data = await res.json();

    if (data && data['ok'] === '\u2714') {
      t.pass(`got valid response, status: ${res.status}`);
    } else {
      t.fail(`got invalid JSON response, status: ${res.status}`);
    }
  } catch (e) {
    t.fail('Failed: ', e);
  }
});

