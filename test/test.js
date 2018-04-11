'use strict';

const path = require('path');
const http2 = require('http2');
const {TLSSocket} = require('tls');
const {promisify} = require('util');
const request = promisify(require('request').defaults({strictSSL: false}));

const tape = require('tape');
const tapSpec = require('tap-spec');
const fetch = require('node-fetch');

const Serv = require('../lib/index.js');

const {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_PATH,
} = http2.constants;


tape.createStream()
  .pipe(tapSpec())
  .pipe(process.stdout);


tape('Static file test', async t => {
  t.plan(1);

  const staticServ = new Serv({dir: path.join(__dirname, './public')});

  try {
    await staticServ.start();
    const {port} = staticServ.options;

    const res = await fetch(`http://localhost:${port}/sample.json`);
    const data = await res.json();

    if (data['😂'] === 'test') {
      t.pass(`Got valid response, status: ${res.status}`);
    } else {
      t.fail(`Got invalid JSON response, status: ${res.status}`);
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

    const res = await fetch(`http://localhost:${port}/garble.txt`);
    const resETag = res.headers.get('ETag');
    const testTag = '691544a391db46480b9a425ae3126fe2a0ec22fa';

    if (resETag && testTag === resETag.toLowerCase()) {
      t.pass(`Got valid ETag: ${resETag}`);
    } else {
      t.fail(`Got invalid ETag: ${resETag}`);
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
      t.pass(`https working, status: ${res.statusCode}`);
    } else {
      t.fail(`https not working, status: ${res.statusCode}`);
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

    const encoding = res.headers.get('content-encoding');

    if (encoding && encoding === 'gzip') {
      t.pass(`gzip ok, encoding: ${encoding}`);
    } else {
      t.fail(`gzip not ok, encoding: ${encoding}`);
    }
  } catch (e) {
    t.fail('Failed: ', e);
  }

  await staticServ.stop();
});


tape('http2 test', async t => {
  t.plan(1);

  const staticServ = new Serv({
    dir: path.join(__dirname, './public'),
    http2: true,
    secure: true,
  });

  try {
    await staticServ.start();
    const {port, certs} = staticServ.options;

    const client = http2.connect(`https://localhost:${port}`, {
      ca: [certs.cert],
    });

    client.on('error', e => t.fail('Failed: ', e));
    client.on('close', _ => false);

    const req = client.request({[HTTP2_HEADER_PATH]: '/garble.txt'});

    req.setEncoding('utf8');

    req.on('response', headers => {
      let data = '';
      req.on('data', chunk => data += chunk);

      req.on('end', async _ => {
        const statusCode = headers[HTTP2_HEADER_STATUS];
        if (statusCode && statusCode === 200) {
          t.pass(`http2 over TLS ok, status: ${statusCode}`);
        } else {
          t.fail(`http2 over TLS not ok, status: ${statusCode}`);
        }
        client.close();
        await staticServ.stop();
      });
    });
  } catch (e) {
    t.fail('Failed: ', e);
    client.close();
    await staticServ.stop();
  }
});
