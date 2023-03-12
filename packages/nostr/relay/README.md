Allows the relay to be shut down with an HTTP request, after which
docker-compose will restart it. This allows each test to have a clean
slate. The drawback is that the tests can't run in parallel, so the
test suite is very slow. A better option would be to have this relay
server manage the relay completely: star/stop isolated relay instances
with HTTP requests and allow multiple instances to run at the same
time so that the tests can be parallelized.
