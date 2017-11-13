# serv

A simple development server for serving static files.

![Terminal screenshot of serv](./snap/terminal.png)

`serv` starts a simple development server for your static files from the
console. It also has options for directory listing, compression and rewriting
any non-existing paths to root of the server.

`serv` runs on a specified port and can be accessed via `localhost:port`
(similar to `127.0.0.1:port`) or `computer-name:port` if you wish to access it
from another device on the local network.

`serv` also supports `h2 (http/2)` and self-signed certificates (`https`).

## Installation

``` bash
$ npm install --global ramlmn/serv

# or

$ git clone https://github.com/ramlmn/serv.git
$ cd serv
$ npm install && npm link
```

## Usage

### From terminal
``` bash
$ serv --dir path/to/dir/ --port 8080
```
#### Flags

Flag                | Default   | Description
--------------------|-----------|-----------------------------------------------
 `-d`, `--dir`      | `.`       | Relative path to directory to serve
 `-p`, `--port`     | `8080`    | Port to listen on
 `-c`, `--compress` | `false`   | Enable compression or not
 `-l`, `--listing`  | `false`   | Enable directory listing
 `-r`, `--rewrite`  | `false`   | Rewrite requests to root
 `-s`, `--secure`   | `false`   | Prefer `https` over `http`
 `-h2`, `--http2`   | `false`   | Run a `h2` server

> **Note:**
> * `--listing` and `--rewrite` cannot be used together.
> * `--secure` option is simply ignored if `--http2` is used.
> * `http` requests are not upgraded automatically to `https`

### From Node API

``` js
const serv = require('serv');

// Options for serv
const options = {
  dir: 'path/to/dir/',
  port: 8080,
  compress: true,
  listing: false,
  rewrite: false,
  secure: true,
  http2: true,
  logger: (request, response) => {
    // Log `request` and `response` or whatever
  },
}

// Create instance of serv
const server = new serv(options);

// Start server
try {
  const status = await server.start();

  if (status.listening) {
    console.log('Server Started');
  } else {
    console.log('Failed to start server', server.status);
  }
} catch (err) {
  console.log('Status:', server.status);
  console.error(err);
}

// For stopping
server.stop();
```

**Note:** `options` are defaulted to as above in flags, check `Serv.DEFAULTS`

## License
[MIT](LICENSE)
