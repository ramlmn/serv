'use strict';

const path = require('path');
const fetch = require('node-fetch');

const tape = require('tape');
const tapSpec = require('tap-spec');

tape.createStream()
  .pipe(tapSpec())
  .pipe(process.stdout);

const Serv = require('../lib/index.js');


tape('Static file test', async t => {
  t.plan(1);

  const staticServ = new Serv({dir: path.join(__dirname, './public')});

  try {
    await staticServ.start();
    const {port} = staticServ.options;

    const data = await (await fetch(`http://localhost:${port}/sample.json`)).json();

    if (data['😂'] === 'test') {
      t.pass('Got valid response');
    } else {
      t.fail('Got invalid JSON response');
    }
  } catch (e) {
    t.fail('Failed: ', e);
  }

  await staticServ.stop();
});


tape('ETag test', async t => {
  t.plan(1);

  const staticServ = new Serv({dir: path.join(__dirname, './public')});

  try {
    await staticServ.start();
    const {port} = staticServ.options;

    const res = await fetch(`http://localhost:${port}/sample.json`);
    const resETag = res.headers.get('ETag');
    const testTag = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';

    if (testTag === resETag) {
      t.pass('Got valid ETag');
    } else {
      t.fail('Got invalid ETag');
    }
  } catch (e) {
    t.fail('Failed: ', e);
  }

  await staticServ.stop();
});
