'use strict';

const path = require('path');
const {TLSSocket} = require('tls');
const {promisify} = require('util');
const request = promisify(require('request').defaults({strictSSL: false}));

const tape = require('tape');
const tapSpec = require('tap-spec');
const fetch = require('node-fetch');

const Serv = require('../lib/index.js');


tape.createStream()
  .pipe(tapSpec())
  .pipe(process.stdout);


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


tape('https test', async t => {
  t.plan(1);

  const staticServ = new Serv({dir: path.join(__dirname, './public'), secure: true});

  try {
    await staticServ.start();
    const {port} = staticServ.options;

    const res = await request(`https://localhost:${port}/sample.json`, {insecure: true});

    if (res.statusCode === 200
      && (res.socket instanceof TLSSocket || res.connection instanceof TLSSocket)) {
      t.pass('https working');
    } else {
      t.fail('https not working');
    }
  } catch (e) {
    t.fail('Failed: ', e);
  }

  await staticServ.stop();
});


tape('compression test', async t => {
  t.plan(1);

  const staticServ = new Serv({dir: path.join(__dirname, './public'), compress: true});

  try {
    await staticServ.start();
    const {port} = staticServ.options;

    const res = await fetch(`http://localhost:${port}/garble.txt`);

    if (res.headers.get('content-encoding') === 'gzip') {
      t.pass('gzip ok');
    } else {
      t.fail('gzip not ok');
    }
  } catch (e) {
    t.fail('Failed: ', e);
  }

  await staticServ.stop();
});
