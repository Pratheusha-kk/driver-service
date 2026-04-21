const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const testDbPath = path.join(
  os.tmpdir(),
  `driver-service-metrics-${process.pid}-${Date.now()}.db`
);

process.env.DB_PATH = testDbPath;
process.env.SERVICE_NAME = "driver-service-test";

const { app } = require("../src/app");
const {
  beginRequest,
  getMetricsSnapshot,
  getPrometheusMetrics
} = require("../src/metrics/serviceMetrics");

test.after(() => {
  fs.rmSync(testDbPath, { force: true });
});

test("app registers the health and metrics endpoints", () => {
  const routes = app.router.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods)
    }));

  assert.deepEqual(
    routes.filter(
      (route) =>
        route.path === "/health" ||
        route.path === "/metrics" ||
        route.path === "/metrics/prometheus"
    ),
    [
      { path: "/health", methods: ["get"] },
      { path: "/metrics", methods: ["get"] },
      { path: "/metrics/prometheus", methods: ["get"] }
    ]
  );
});

test("metrics snapshot reports CPU, memory, and response-time metrics", async () => {
  const before = getMetricsSnapshot();
  const completeHealth = beginRequest("GET", "/health");
  const completeDrivers = beginRequest("GET", "/v1/drivers");

  await new Promise((resolve) => setTimeout(resolve, 5));

  completeHealth(200);
  completeDrivers(200);

  const metrics = getMetricsSnapshot();

  assert.equal(metrics.health.status, "ok");
  assert.equal(metrics.health.service, "driver-service-test");
  assert.equal(typeof metrics.uptime_seconds, "number");

  assert.equal(typeof metrics.cpu.cores, "number");
  assert.equal(typeof metrics.cpu.user_ms, "number");
  assert.equal(typeof metrics.cpu.system_ms, "number");
  assert.equal(typeof metrics.cpu.utilization_percentage, "number");

  assert.equal(typeof metrics.memory.rss_bytes, "number");
  assert.equal(typeof metrics.memory.heap_used_bytes, "number");

  assert.equal(
    metrics.response_time.total_requests_started,
    before.response_time.total_requests_started + 2
  );
  assert.equal(
    metrics.response_time.total_requests_completed,
    before.response_time.total_requests_completed + 2
  );
  assert.equal(metrics.response_time.active_requests, 0);
  assert.equal(typeof metrics.response_time.average_response_time_ms, "number");
  assert.equal(typeof metrics.response_time.max_response_time_ms, "number");
  assert.equal(typeof metrics.response_time.last_response_time_ms, "number");
  assert.ok(metrics.response_time.status_codes["200"] >= 2);
  assert.ok(metrics.response_time.by_route["GET /health"]);
  assert.ok(metrics.response_time.by_route["GET /v1/drivers"]);
  assert.ok(
    metrics.response_time.by_route["GET /health"].count >=
      (before.response_time.by_route["GET /health"]?.count || 0) + 1
  );
  assert.ok(
    metrics.response_time.by_route["GET /v1/drivers"].count >=
      (before.response_time.by_route["GET /v1/drivers"]?.count || 0) + 1
  );
});

test("prometheus metrics export includes service and route metrics", async () => {
  const completeHealth = beginRequest("GET", "/health");

  await new Promise((resolve) => setTimeout(resolve, 5));

  completeHealth(200);

  const payload = getPrometheusMetrics();

  assert.match(payload, /# TYPE driver_service_up gauge/);
  assert.match(
    payload,
    /driver_service_up\{service="driver-service-test"\} 1/
  );
  assert.match(payload, /driver_service_cpu_user_ms_total\{/);
  assert.match(payload, /driver_service_memory_bytes\{service="driver-service-test",area="rss"\}/);
  assert.match(
    payload,
    /driver_service_route_requests_total\{service="driver-service-test",route="GET \/health"\}/
  );
  assert.match(
    payload,
    /driver_service_route_response_time_ms\{service="driver-service-test",route="GET \/health",aggregation="average"\}/
  );
});
