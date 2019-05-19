const path = require('path');
const {stat: fsStat, readdir} = require('fs');
const {promisify} = require('util');

const readDir = promisify(readdir);
const stat = promisify(fsStat);

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
 * @param {Object} resHeaders
 * @return {Boolean}
 */
const isPreconditionFailure = (req, resHeaders) => {
  // if-match
  const match = resHeaders['if-match'];
  if (match) {
    const etag = resHeaders['ETag'];
    return !etag || (match !== '*' && parseTokenList(match).every(match => {
      return match !== etag && match !== 'W/' + etag && 'W/' + match !== etag;
    }));
  }

  // if-unmodified-since
  const unmodifiedSince = parseHttpDate(req.headers['if-unmodified-since']);
  if (!isNaN(unmodifiedSince)) {
    const lastModified = parseHttpDate(resHeaders['Last-Modified']);
    return isNaN(lastModified) || lastModified > unmodifiedSince;
  }

  return false;
};


/**
 * Check if the cache is fresh.
 *
 * @param {Object} req
 * @param {Object} resHeaders
 * @return {Boolean}
 */
const isFresh = (req, resHeaders) => {
  return fresh(req.headers, {
    etag: resHeaders['ETag'],
    'last-modified': resHeaders['Last-Modified'],
  });
};


/**
 * http GET precondition fail check
 *
 * @param {Object} req
 * @param {Object} resHeaders
 * @return {Boolean}
 */
const preFail = (req, resHeaders) => {
  if (isConditionalGet(req)) {
    if (isPreconditionFailure(req, resHeaders)) {
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

  const files = await Promise.all((await readDir(rootDir))
    .filter(t => !exclude.includes(t))
    .sort((a, b) => a > b)
    .map(async filename => {
      let l = `<li class="file"><a href="${pathname}${filename}"><span>${filename}</span></a></li>`;
      try {
        if ((await stat(path.join('.', pathname, filename))).isDirectory()) {
          l = `
            <li class="folder"><a href="${pathname}${filename}"><span>${filename}</span></a></li>
          `;
        }
      } catch (e) {}
      return l;
    }));

  if (pathname !== '/') {
    const upDir = path.normalize(path.join(req.pathname, '..'));
    files.unshift(`<li><a href="${upDir}"><span>..</span></a></li>`);
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
      <style>
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 16px;
          font-size: 18px;
          font-family: Menlo, Monaco, Consolas, monospace;
          line-height: 1.5;
          color: #212121;
        }
        .container {
          max-width: 600px;
          margin: auto;
        }
        h1 {
          margin: 0;
          font-size: 1.5em;
          font-weight: normal;
        }
        ul {
          list-style: none;
          padding: 0 1em;
        }
        li a {
          color: inherit;
          display: flex;
          align-items: center;
          padding: 4px;
        }
        li a::before {
          content: '';
          width: 24px;
          height: 24px;
          background-size: cover;
          margin: 0 8px 0 0;
        }
        li.file a::before {
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0V0z"/><path fill="grey" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>');
        }
        li.folder a::before {
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" d="M0 0h24v24H0V0z"/><path fill="grey" d="M9.17 6l2 2H20v10H4V6h5.17M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>');
        }
        li a, h1 {
          text-decoration: none;
          word-wrap: break-word;
        }
        li a:hover , li a:focus , li a:active {
          background-color: rgba(0, 0, 0, 0.15);
        }
        li a span {
          flex: 1;
          word-break: break-word;
        }
      </style>
    </head>
    <body>
      <main class="container">
        <h1>Index of ${pathname}</h1>
        ${content}
      </main>
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
