# benchmarking

Benchmarking is done through [wrk](https://github.com/wg/wrk).

Tests are run based on requests to a JSON file, all three servers are requested
for the JSON file. [polka](https://github.com/lukeed/polka]) and
[express](https://github.com/expressjs/express) use
[express-static](https://github.com/expressjs/serve-static) and
[serv](https://github.com/ramlmn/serv) uses a custom implementation of
express-static(`lib/static-serve.js`).

Benchmarking can be done by running individual files in bench folder. For every
request the disk is hit multiple times.

# results

Ran on Node v9.9.0

```
wrk polka -
Running 30s test @ http://localhost:41937/sample.json
  8 threads and 100 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency    20.22ms    5.99ms  76.55ms   87.85%
    Req/Sec   599.41    109.79   787.00     64.97%
  143483 requests in 30.10s, 40.50MB read
Requests/sec:   4766.97
Transfer/sec:      1.35MB
```

```
wrk express -
Running 30s test @ http://localhost:41507/sample.json
  8 threads and 100 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency    22.72ms    6.88ms 102.05ms   90.74%
    Req/Sec   535.25    105.08   727.00     82.62%
  128092 requests in 30.09s, 38.97MB read
Requests/sec:   4256.37
Transfer/sec:      1.29MB
```

```
wrk serv -
Running 30s test @ http://localhost:33195/sample.json
  8 threads and 100 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency    19.85ms    5.89ms  86.85ms   89.21%
    Req/Sec   611.44    116.96     0.86k    77.57%
  146249 requests in 30.08s, 37.66MB read
Requests/sec:   4861.71
Transfer/sec:      1.25MB
```
