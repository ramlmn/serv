'use strict';

const crypto = require('crypto');

const addEtag = (req, res, next) => {
  const write = res.write;
  const end = res.end;
  const send = res.send;

  const onData = (...args) => {
    if (!res.headersSent
      && !res.getHeader('Transfer-Encoding')
      && !res.getHeader('TE')
      && res.getHeader('Content-Length')) {
      const body = args[0];

      const etag = crypto.createHash('sha1')
        .update(body)
        .digest('hex');

      res.setHeader('ETag', etag);
    }
  };

  res.write = (...args) => {
    onData(...args);
    write.apply(res, [...args]);
  };

  res.end = (...args) => {
    onData(...args);
    end.apply(res, [...args]);
  };

  res.send = (...args) => {
    onData(...args);
    send.apply(res, [...args]);
  };

  next();
};


module.exports = addEtag;
