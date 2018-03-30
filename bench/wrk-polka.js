'use strict';

const path = require('path');
const {promisify} = require('util');
const exec = promisify(require('child_process').exec);

const getPort = require('get-port');
const express = require('express');
const polka = require('polka');


// wrk polka logs
const wrkPolka = async _ => {
  const app = polka();
  let server;
  app.use(express.static(path.join(__dirname, '../test/public')));

  try {
    const port = await getPort();
    await app.listen(port);
    server = app.server;

    const data = await exec(`wrk -t8 -c100 -d30s http://localhost:${port}/sample.json`);

    console.log('\nwrk polka -');
    console.log(data.stdout);
  } catch (e) {
    console.error('Failed to test polka with wrk: ', e);
  }

  if (server) {
    server.close();
  }
};


wrkPolka();
