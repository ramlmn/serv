const path = require('path');
const {readdir} = require('fs');
const {promisify} = require('util');

const readDir = promisify(readdir);

const fresh = require('fresh');

/*
  'parseHttpDate', 'parseTokenList', 'isConditionalGet', 'isPreconditionFailure',
  'isFresh', 'preFail' -> https://github.com/pillarjs/send/
*/

/**
 * Parse an HTTP Date into a number
 *
 * @param {String} date
 * @return {String}
 */
const parseHttpDate = date => {
  const timestamp = date && Date.parse(date);

  return typeof timestamp === 'number'
    ? timestamp
    : NaN;
};


/**
 * Parse a HTTP token list
 *
 * @param {String} str
 * @return {Array}
 */
const parseTokenList = str => {
  let end = 0;
  let list = [];
  let start = 0;

  for (let i = 0, len = str.length; i < len; i++) {
    switch (str.charCodeAt(i)) {
      case 0x20: /*   */
        if (start === end) {
          start = end = i + 1;
        }
        break;
      case 0x2c: /* , */
        list.push(str.substring(start, end));
        start = end = i + 1;
        break;
      default:
        end = i + 1;
        break;
    }
  }

  list.push(str.substring(start, end));
  return list;
};


/**
 * Check if this is a conditional GET request
 *
 * @param {Object} req
 * @return {Boolean}
 */
const isConditionalGet = req => {
  return req.headers['if-match'] ||
    req.headers['if-unmodified-since'] ||
    req.headers['if-none-match'] ||
    req.headers['if-modified-since'];
};


/**
 * Check if the request preconditions failed
 *
 * @param {Object} req
 * @param {Object} res
 * @return {Boolean}
 */
const isPreconditionFailure = (req, res) => {
  // if-match
  const match = req.headers['if-match'];
  if (match) {
    const etag = res.getHeader('ETag');
    return !etag || (match !== '*' && parseTokenList(match).every(match => {
      return match !== etag && match !== 'W/' + etag && 'W/' + match !== etag;
    }));
  }

  // if-unmodified-since
  const unmodifiedSince = parseHttpDate(req.headers['if-unmodified-since']);
  if (!isNaN(unmodifiedSince)) {
    const lastModified = parseHttpDate(res.getHeader('Last-Modified'));
    return isNaN(lastModified) || lastModified > unmodifiedSince;
  }

  return false;
};


/**
 * Check if the cache is fresh.
 *
 * @param {Object} req
 * @param {Object} res
 * @return {Boolean}
 */
const isFresh = (req, res) => {
  return fresh(req.headers, {
    etag: res.getHeader('ETag'),
    'last-modified': res.getHeader('Last-Modified'),
  });
};


/**
 * http GET precondition fail check
 *
 * @param {Object} req
 * @param {Object} res
 * @return {Boolean}
 */
const preFail = (req, res) => {
  if (isConditionalGet(req)) {
    if (isPreconditionFailure(req, res)) {
      return true;
    }
  }

  return false;
};


const renderDir = async (req, rootDir) => {
  let content = '';
  const pathname = req.pathname.endsWith('/') ? req.pathname : `${req.pathname}/`;
  const exclude = [
    '.DS_Store',
    '.git'
  ];

  const files = (await readDir(rootDir))
    .filter(t => !exclude.includes(t))
    .sort((a, b) => a > b)
    .map(filename => {
      return `<li><a href="${pathname}${filename}">${filename}</a></li>`;
    });

  if (pathname !== '/') {
    const upDir = path.normalize(path.join(req.pathname, '..'));
    files.unshift(`<li><a href="${upDir}">..</a></li>`);
  }

  files.unshift('<ul>');
  files.push('</ul>');

  content = files.join('\n');

  const body = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Index of ${pathname}</title>
    </head>
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 16px;
        font-size: 16px;
        font-family: Menlo, Monaco, Consolas, monospace;
        line-height: 1.5;
      }
      h1 {
        margin: 0;
        font-size: 1.25em;
      }
      ul {
        list-style: none;
        padding-left: 1em;
      }
      a, h1 {
        text-decoration: none;
        word-wrap: break-word;
      }
      a:hover {
        text-decoration: underline;
      }
    </style>
    <body>
      <h1>Index of ${pathname}</h1>
      ${content}
    </body>
    </html>
  `;

  return body;
};

module.exports = {
  isFresh,
  preFail,
  renderDir,
};
