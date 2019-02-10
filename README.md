[![npm-badge](https://img.shields.io/npm/v/@ramlmn/serv.svg?&style=flat-square)](https://www.npmjs.com/package/@ramlmn/serv)
[![travis-badge](https://img.shields.io/travis/ramlmn/serv/master.svg?label=Travis&style=flat-square)](https://travis-ci.org/ramlmn/serv)
[![appveyor-badge](https://img.shields.io/appveyor/ci/r0mflip/serv.svg?label=AppVeyor&style=flat-square)](https://ci.appveyor.com/project/r0mflip/serv)

# serv

Static file server with https, http2 (recommened only for development)

![terminal.png](snap/terminal.png)

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


#### Flags

 Flag               | Description
--------------------|-----------------------------------------------
 `-p`, `--port`     | Port to listen on (default 5000)
 `-d`, `--dir`      | Relative path to directory to serve
 `-l`, `--listing`  | Enable directory listing
 `-s`, `--secure`   | Enables SSL flag
 `-2`, `--http2`    | Enables http2 flag
 `-c`, `--compress` | Enables compression
 `-h`, `--help`     | Shows usage and options

**Note:** Currently no browser supports http2 without TLS, `--http2` currently is
worthy only when used with `-s`
[(ref)](https://nodejs.org/api/http2.html#http2_server_side_example)


## License

[MIT](LICENSE)
