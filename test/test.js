const tape = require('tape');
const _test = require('tape-promise').default;
const getPort = require('get-port');
const runner = require('./runner.js');
const {testCli} = require('./cli-runner.js');

const test = _test(tape);

test('cli: default port 5000', async t => {
  const [err, res] = await testCli({}, 5000, '/index.html');
  t.equal(err, null, 'no error');
  t.equal(res.status, 200, 'got 200');
  t.end();
});

test('cli: use port from environment', async t => {
  const PORT = await getPort();
  process.env.PORT = PORT;
  const [err, res] = await testCli({}, PORT, '/index.html');
  process.env.PORT = null;
  t.equal(err, null, 'no error');
  t.equal(res.status, 200, 'got 200');
  t.end();
});

test('cli: test https, default port', async t => {
  const [err, res] = await testCli({ssl: true}, 5000, '/index.html');
  t.equal(err, null, 'no error');
  t.equal(res.status, 200, 'got 200');
  t.end();
});

test('cli: test https, environment port', async t => {
  const PORT = await getPort();
  process.env.PORT = PORT;
  const [err, res] = await testCli({ssl: true}, PORT, '/index.html');
  process.env.PORT = null;
  t.equal(err, null, 'no error');
  t.equal(res.status, 200, 'got 200');
  t.end();
});

test('200 response over http', async t => {
  const res = await runner.run({}, '/sample.json');
  t.true(res.headers.get('ETag'), 'has ETag');
  await t.doesNotReject(res.json(), 'body okay');
  t.equal(res.status, 200, 'got 200');
  t.end();
});

test('200 response over https', async t => {
  const res = await runner.run({'self-signed': true}, '/sample.json');
  t.true(res.headers.get('ETag'), 'has ETag');
  await t.doesNotReject(res.json(), 'body okay');
  t.equal(res.status, 200, 'got 200');
  t.end();
});

test('compression over http', async t => {
  const res = await runner.run({compress: true}, '/subdir/garble.txt');
  t.equal(res.status, 200, 'got 200');
  t.equal(res.headers.get('Content-Encoding'), 'gzip', 'is gzip');
  t.end();
});

test('compression over https', async t => {
  const res = await runner.run({'self-signed': true, compress: true}, '/subdir/garble.txt');
  t.equal(res.status, 200, 'got 200');
  t.equal(res.headers.get('Content-Encoding'), 'gzip', 'is gzip');
  t.end();
});

test('content length over http', async t => {
  const res = await runner.run({}, '/index.html');
  t.equal(res.status, 200, 'got 200');
  t.looseEquals(res.headers.get('Content-Length'), 219, 'exact length');
  t.end();
});

test('content length over https', async t => {
  const res = await runner.run({'self-signed': true}, '/index.html');
  t.equal(res.status, 200, 'got 200');
  t.looseEqual(res.headers.get('Content-Length'), 219, 'exact length');
  t.end();
});

test('non existent file should 404', async t => {
  const res = await runner.run({}, '/nonexistent.file');
  t.equal(res.status, 404, 'got 404');
  t.end();
});

test('non existent file should 404, no extension', async t => {
  const res = await runner.run({}, '/nonexistent');
  t.equal(res.status, 404, 'got 404');
  t.end();
});

test('index should be served in root', async t => {
  const res = await runner.run({}, '/');
  t.equal(res.status, 200, 'got 200');
  t.equal(res.headers.get('Content-Type'), 'text/html', 'got text/html');
  await t.doesNotReject(res.text(), 'body okay');
  t.end();
});

test('index should be served inside subdir', async t => {
  const res = await runner.run({}, '/subdir-2/');
  t.equal(res.status, 200, 'got 200');
  t.equal(res.headers.get('Content-Type'), 'text/html', 'got text/html');
  await t.doesNotReject(res.text(), 'body okay');
  t.end();
});

test('no extension file should 200', async t => {
  const res = await runner.run({}, '/noextfile');
  t.equal(res.status, 200, 'got 200');
  t.end();
});

test('no index 404 in directories', async t => {
  const res = await runner.run({}, '/subdir/');
  t.equal(res.status, 404, 'got 404');
  t.end();
});

test('no index 404 in directories, no tailing slash', async t => {
  const res = await runner.run({}, '/subdir');
  t.equal(res.status, 404, 'got 404');
  t.end();
});

test('directory listing should give html', async t => {
  const res = await runner.run({listing: true}, '/subdir/');
  await t.doesNotReject(res.text(), 'body okay');
  t.equal(res.status, 200, 'got 200');
  t.false(res.headers.get('ETag'), 'no ETag');
  t.equal(res.headers.get('Content-Type'), 'text/html', 'got text/html');
  t.equal(res.headers.get('Cache-Control'), 'no-cache', 'no-cache set');
  t.end();
});

test('directory listing, no trailing slash', async t => {
  const res = await runner.run({listing: true}, '/subdir');
  await t.doesNotReject(res.text(), 'body okay');
  t.equal(res.status, 200, 'got 200');
  t.false(res.headers.get('ETag'), 'no ETag');
  t.equal(res.headers.get('Content-Type'), 'text/html', 'got text/html');
  t.equal(res.headers.get('Cache-Control'), 'no-cache', 'no-cache set');
  t.end();
});

test('directory named extension should 404', async t => {
  const res = await runner.run({}, '/dir.ext/');
  t.equal(res.status, 404, 'got 404');
  t.end();
});

test('directory named extension, no trailing slash', async t => {
  const res = await runner.run({}, '/dir.ext');
  t.equal(res.status, 404, 'got 404');
  t.end();
});

test('markdown file inside fold.er', async t => {
  const res = await runner.run({}, '/fold.er/some.md');
  await t.doesNotReject(res.text(), 'body okay');
  t.equal(res.status, 200, 'got 200');
  t.true(res.headers.get('ETag'), 'has ETag');
  t.equal(res.headers.get('Content-Type'), 'text/markdown', 'got text/markdown');
  t.equal(res.headers.get('Cache-Control'), 'public, max-age=31536000', 'cache header set');
  t.end();
});

test('non-existent subdir should 404', async t => {
  const res = await runner.run({}, '/subdir/noexistent/dir/');
  t.equal(res.status, 404, 'got 404');
  t.end();
});

test('non-existent subdir should 404', async t => {
  const res = await runner.run({}, '/subdir/noexistent/dir/');
  t.equal(res.status, 404, 'got 404');
  t.end();
});

test('ranged request for file', async t => {
  const res = await runner.run(
    {fetchOpts: {headers: {Range: 'bytes=540-761/*'}}},
    '/subdir/garble.txt'
  );
  t.equal(res.status, 206, 'got 206');
  t.looseEqual(res.headers.get('Content-Length'), 222, 'got 222 bytes');
  t.equal(res.headers.get('Cache-Control'), 'public, max-age=31536000', 'cache header set');
  t.end();
});

test('invalid range should 416', async t => {
  const res = await runner.run(
    {fetchOpts: {headers: {Range: 'bytes=761-540/*'}}},
    '/subdir/garble.txt'
  );
  t.equal(res.status, 416, 'got 416');
  t.looseEqual(res.headers.get('Content-Length'), 1028, 'got all 1028 bytes');
  t.equal(res.headers.get('Cache-Control'), 'public, max-age=31536000', 'cache header set');
  t.end();
});

test('invalid range, over size should 416', async t => {
  const res = await runner.run(
    {fetchOpts: {headers: {Range: 'bytes=2100-2151/1028'}}},
    '/subdir/garble.txt'
  );
  t.equal(res.status, 416, 'got 416');
  t.looseEqual(res.headers.get('Content-Length'), '1028', 'got all 1028 bytes');
  t.equal(res.headers.get('Cache-Control'), 'public, max-age=31536000', 'cache header set');
  t.end();
});
