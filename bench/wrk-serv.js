'use strict';

const path = require('path');
const {promisify} = require('util');
const exec = promisify(require('child_process').exec);

const Serv = require('../lib/index.js');


// wrk serv logs
const wrkServ = async _ => {
  const staticServ = new Serv({dir: path.join(__dirname, '../test/public'), fast: true});

  try {
    await staticServ.start();
    const {port} = staticServ.options;

    const data = await exec(`wrk -t8 -c100 -d30s http://localhost:${port}/sample.json`);

    console.log('\nwrk serv -');
    console.log(data.stdout);
  } catch (e) {
    console.error('Failed to test serv with wrk: ', e);
  }

  staticServ.stop();
};


wrkServ();
