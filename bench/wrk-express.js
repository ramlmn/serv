'use strict';

const path = require('path');
const {promisify} = require('util');
const exec = promisify(require('child_process').exec);

const getPort = require('get-port');
const express = require('express');


// wrk polka logs
const wrkExpress = async _ => {
  const app = express();
  let server;
  app.use(express.static(path.join(__dirname, '../test/public')));

  try {
    const port = await getPort();
    server = app.listen(port, async _ => {
      const data = await exec(`wrk -t8 -c100 -d30s http://localhost:${port}/sample.json`);

      console.log('\nwrk express -');
      console.log(data.stdout);

      if (server) {
        server.close();
      }
    });
  } catch (e) {
    console.error('Failed to test express with wrk: ', e);
    if (server) {
      server.close();
    }
  }
};


wrkExpress();
