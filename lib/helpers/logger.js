'use strict';

const uuid4 = require('uuid/v4');
const first = require('ee-first');

const dateString = () => {
  return (new Date()).toISOString();
};

const getLevelForResponseCode = (statusCode) => {
  if (statusCode >= 500) {
    return 'error';
  } else if (statusCode >= 400) {
    return 'warn';
  }

  return 'info';
};

const log = (direction, level, requestId, ...args) => {
  console[level](direction, level, dateString(), `[${requestId}]`, ...args);
};

const logRequest = (level, requestId, ...args) => {
  log('-->', level, requestId, ...args);
};

const logResponse = (level, requestId, ...args) => {
  log('<--', level, requestId, ...args);
};

const logger = (req, res, next) => {
  // unique id to match request and response
  const requestId = uuid4().substr(0, 8);

  let eeReq;
  let eeSocket;
  let finished = false;

  // incoming request
  logRequest('info', requestId, req.method, req.url);

  const cleanup = _ => {
    eeReq.cancel();
    eeSocket.cancel();
  };

  // for outgoing response
  const logHandler = (error, ee, event) => {
    cleanup();

    if (finished) {
      return;
    }

    finished = true;

    if (event === 'end' || event === 'finish') {
      // res sent
      const resLength = res.getHeader('content-length') || 0;
      const level = getLevelForResponseCode(res.statusCode);

      logResponse(level, requestId, res.statusCode, `${resLength}b sent`);
    } else if (event === 'close') {
      // socket closed
      logResponse('warn', requestId, 'Request aborted by client');
    } else if (event === 'error') {
      // socket error
      logResponse('error', requestId, `Request pipeline error: ${error}`);
    }
  };

  const onSocket = socket => {
    res.removeListener('socket', onSocket);

    if (finished) {
      return;
    }

    if (eeReq !== eeSocket) {
      return;
    }

    eeSocket = first([[socket, 'error', 'close']], logHandler);
  };

  // listen for normal reponse first
  eeReq = eeSocket = first([[res, 'end', 'finish']], logHandler);

  if (res.socket) {
    // socket already created
    onSocket(res.socket);
  } else {
    // wait for socket to be created
    res.on('socket', onSocket);
  }

  return next();
};


module.exports = logger;
