# serv

A Simple development server for serving static files.

![Terminal screenshot of serv](./snap/terminal.png)

`serv` starts a simple development server for your static files from the
console. It also has options for directory listing, compression and rewriting
any non-existing paths to root of the server.

`serv` runs on a specified port and can be accessed via `localhost:port` 
(similar to `127.0.0.1:port`) or `computer-name:port` if you wish to access it
from another device on the local network.

## Installation

``` bash
$ npm install ramlmn/serv

# or

$ git clone https://github.com/ramlmn/serv.git
$ cd serv
$ npm i && npm link
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
 `-p`, `--port`     | `5800`    | Port to listen on
 `-c`, `--compress` | `false`   | Enable compression or not
 `-l`, `--listing`  | `false`   | Enable directory listing
 `-r`, `--rewrite`  | `false`   | Rewrite requests to root

**WARN:** `--listing` and `--rewrite` cannot be used together.

### From Node API

``` js
const serv = require('serv');

// Options for serv
const options = {
  dir: 'path/to/dir/',
  port: 5800,
  compress: true,
  listing: false,
  rewrite: false,
  logger: (request, response) => {
    // Log `request` and `response` or whatever
  },
}

// Create instance of serv
const server = new serv(options);

// Start server
server.start()
  .then(_ => {
    console.log('Server Started');
  })
  .catch(err => {
    console.log('Failed to start server.', err);
  });

// For stopping
server.stop();
```

**Note:** `options` are defaulted to as above in flags, check `Serv.DEFAULTS`

## License
MIT
