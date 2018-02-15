'use strict';


const HTTPSRedirect = (req, res, next) => {
  if (req.hostname === 'localhost') {
    return next();
  }

  // For non-localhost hosts, check the header for the protocol used.
  if (!req.headers['x-forwarded-proto']) {
    return next();
  }

  if ((req.headers['x-forwarded-proto'] || '').toLowerCase() === 'http') {
    // reason for the redirect
    res.setHeader('Non-Authoritative-Reason', 'HSTS');

    // internal (temporary) redirect
    return res.redirect(307, `https://${req.hostname}${req.url}`);
  }

  return next();
};


module.exports = HTTPSRedirect;
