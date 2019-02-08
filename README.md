# serv

A development server for serving static files with https, http2, compression...

## Installation

``` bash
$ npm install --global @ramlmn/serv

# or

$ git clone https://github.com/ramlmn/serv.git && cd serv
$ npm install && npm link
```
Try `sudo` with `npm link` if it fails.

**Note:** Windows users, get OpenSSL from
[https://slproweb.com/products/Win32OpenSSL.html](https://slproweb.com/products/Win32OpenSSL.html)

## Usage

### From terminal
``` bash
$ serv --dir path/to/dir/ --port 8080
```

Use `--help` for help and examples.
#### Flags

Flag                | Default   | Description
--------------------|-----------|-----------------------------------------------
 `-p`, `--port`     | `8080`    | Port to listen on
 `-d`, `--dir`      | `.`       | Relative path to directory to serve
 `-l`, `--listing`  | `false`   | Enable directory listing
 `-s`, `--secure`   | `false`   | Enables SSL flag
 `-2`, `--http2`    | `false`   | Enables http2 flag
 `-c`, `--compress` | `false`   | Enables compression

**Note:** Currently no browser supports http2 without TLS, `--http2` currently is
worthy only when used with `-s`
[(ref)](https://nodejs.org/api/http2.html#http2_server_side_example)

## License
[MIT](LICENSE)
