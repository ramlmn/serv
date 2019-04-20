[![npm-badge](https://img.shields.io/npm/v/@ramlmn/serv.svg?&style=flat-square)](https://www.npmjs.com/package/@ramlmn/serv)
[![travis-badge](https://img.shields.io/travis/ramlmn/serv/master.svg?label=Travis&style=flat-square)](https://travis-ci.org/ramlmn/serv)
[![appveyor-badge](https://img.shields.io/appveyor/ci/r0mflip/serv.svg?label=AppVeyor&style=flat-square)](https://ci.appveyor.com/project/r0mflip/serv)

# serv

Static file server with https, http2 (recommened only for development)

![terminal.png](snap/terminal.png)

## Installation

``` bash
$ npm install --global @ramlmn/serv
```

**Note:** Windows users, get OpenSSL from
[https://slproweb.com/products/Win32OpenSSL.html](https://slproweb.com/products/Win32OpenSSL.html)


## Usage

```
  serv - Static file server with https and http2

  Usage
    Serve current directory

      $ serv

    Listen on port 8080 with compression

      $ serv --port 8080 --compress -d ./site/

    Listen over https with directory listing (uses self-signed certificates)

      $ serv --self-signed --listing

    Use specific SSL certificate and private key

      $ serv --ssl-cert ./cred.cert --ssl-key ./cred.key

  Options
    -h, --help             Shows this help text
    -p, --port             Port to listen on (default $PORT or 5000)
    -d, --dir              Path to directory
    -l, --listing          Enable directory listing
    -s, --self-signed      Use self-signed certificates (enables TLS/SSL)
    --ssl-cert             Path to SSL certificate file (enables TLS/SSL)
    --ssl-key              Path to SSL private key file (enables TLS/SSL)
    -2, --http2            Use http2 (enables TLS/SSL)
    -c, --compress         Enables compression (gzip)
```

**Note:** Currently no browser supports http2 without TLS, `--http2` currently is
worthy only when TLS/SSL is enabled
[(ref)](https://nodejs.org/api/http2.html#http2_server_side_example)


## License

[MIT](LICENSE)
