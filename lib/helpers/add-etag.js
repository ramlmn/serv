'use strict';

const crypto = require('crypto');

const addEtag = (req, res, next) => {
  const data = [];

  req.on('data', chunk => {
    data.push(chunk);
  });

  req.on('end', _ => {
    const body = Buffer.concat(data);
    const etag = crypto.createHash('sha1')
      .update(body)
      .digest('hex');

    res.setHeader('ETag', etag);

    next();
  });
};

module.exports = addEtag;
