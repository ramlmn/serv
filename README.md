# serv

A simple development server for serving static files.

![Terminal screenshot of serv](./snap/terminal.png)

`serv` starts a simple development server for your static files from the
console written in NodeJS. It also supports directory listing and compression.

serv can run a `http` or `https`(self-signed) and `http2` server.

`serv` runs on a specified port and can be accessed via `localhost:port`
(similar to `127.0.0.1:port`) or `computer-name:port` if you wish to access it
from another device on the local network.

> *Note:* serv is a hacky, experimental project

## Installation

``` bash
$ npm install --global @ramlmn/serv

# or

$ git clone https://github.com/ramlmn/serv.git
$ cd serv
$ npm install && npm link
```
Try `sudo` with `npm link` if it fails.

> NOTE: Windows users, get OpenSSL from [https://slproweb.com/products/Win32OpenSSL.html](https://slproweb.com/products/Win32OpenSSL.html)
## Usage

### From terminal
``` bash
$ serv --dir path/to/dir/ --port 8080
```

Use `--help` for help and examples.
#### Flags

Flag                | Default   | Description
--------------------|-----------|-----------------------------------------------
 `-d`, `--dir`      | `.`       | Relative path to directory to serve
 `-p`, `--port`     | `8080`    | Port to listen on
 `-c`, `--compress` | `false`   | Enable compression or not
 `-l`, `--listing`  | `false`   | Enable directory listing
 `-s`, `--secure`   | `false`   | Prefer `https` over `http`
 `-h2`, `--http2`   | `false`   | Run a `h2` server
 `-f`, `--fast`     | `false`   | Fast mode(no compression, ETags, logging)

### From Node API

``` js
const serv = require('serv');

// Options for serv
const options = {
  dir: 'path/to/dir/',
  port: 8080,
  compress: true,
  listing: false,
  secure: true,
  http2: true,
  fast: false,
  logger: (request, response) => {
    // Log `request` and `response` or whatever
  },
}

// Create instance of serv
const staticServer = new serv(options);

// Start server
try {
  const server = await staticServer.start();

  if (status.listening) {
    console.log('Server Started');
  } else {
    console.log('Failed to start server');
  }
} catch (err) {
  console.error(err);
}

// For stopping
server.stop();
```

## License
[MIT](LICENSE)
