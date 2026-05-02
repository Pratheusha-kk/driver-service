const os = require("node:os");
const { env } = require("../config/env");

const requestMetrics = {
  startedAt: new Date().toISOString(),
  totalRequestsStarted: 0,
  totalRequestsCompleted: 0,
  activeRequests: 0,
  totalResponseTimeMs: 0,
  maxResponseTimeMs: 0,
  lastResponseTimeMs: 0,
  statusCodes: {},
  routes: {}
};

function round(value) {
  return Number(value.toFixed(2));
}

function getRouteKey(method, path) {
  return `${method} ${path || "/"}`;
}

function getOrCreateRouteMetrics(routeKey) {
  if (!requestMetrics.routes[routeKey]) {
    requestMetrics.routes[routeKey] = {
      count: 0,
      totalResponseTimeMs: 0,
      maxResponseTimeMs: 0,
      lastResponseTimeMs: 0,
      lastStatusCode: null,
      statusCodes: {}
    };
  }

  return requestMetrics.routes[routeKey];
}

function beginRequest(method, path) {
  if (path === "/metrics" || path === "/metrics/prometheus") {
    return () => {};
  }

  requestMetrics.totalRequestsStarted += 1;
  requestMetrics.activeRequests += 1;

  const routeKey = getRouteKey(method, path);
  const startedAt = process.hrtime.bigint();
  let completed = false;

  return (statusCode) => {
    if (completed) {
      return;
    }

    completed = true;

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const routeMetrics = getOrCreateRouteMetrics(routeKey);

    requestMetrics.activeRequests -= 1;
    requestMetrics.totalRequestsCompleted += 1;
    requestMetrics.totalResponseTimeMs += durationMs;
    requestMetrics.maxResponseTimeMs = Math.max(
      requestMetrics.maxResponseTimeMs,
      durationMs
    );
    requestMetrics.lastResponseTimeMs = durationMs;
    requestMetrics.statusCodes[statusCode] =
      (requestMetrics.statusCodes[statusCode] || 0) + 1;

    routeMetrics.count += 1;
    routeMetrics.totalResponseTimeMs += durationMs;
    routeMetrics.maxResponseTimeMs = Math.max(
      routeMetrics.maxResponseTimeMs,
      durationMs
    );
    routeMetrics.lastResponseTimeMs = durationMs;
    routeMetrics.lastStatusCode = statusCode;
    routeMetrics.statusCodes[statusCode] =
      (routeMetrics.statusCodes[statusCode] || 0) + 1;
  };
}

function getCpuMetrics() {
  const cpuUsage = process.cpuUsage();
  const cpuCount =
    typeof os.availableParallelism === "function"
      ? os.availableParallelism()
      : os.cpus().length || 1;
  const totalCpuMs = (cpuUsage.user + cpuUsage.system) / 1000;
  const possibleCpuMs = process.uptime() * 1000 * cpuCount;
  const utilizationPercentage =
    possibleCpuMs > 0 ? (totalCpuMs / possibleCpuMs) * 100 : 0;

  return {
    cores: cpuCount,
    user_ms: round(cpuUsage.user / 1000),
    system_ms: round(cpuUsage.system / 1000),
    total_ms: round(totalCpuMs),
    utilization_percentage: round(utilizationPercentage),
    load_average: os.loadavg().map(round)
  };
}

function getMemoryMetrics() {
  const memoryUsage = process.memoryUsage();

  return {
    rss_bytes: memoryUsage.rss,
    heap_total_bytes: memoryUsage.heapTotal,
    heap_used_bytes: memoryUsage.heapUsed,
    external_bytes: memoryUsage.external,
    array_buffers_bytes: memoryUsage.arrayBuffers
  };
}

function getRouteMetricsSnapshot() {
  return Object.fromEntries(
    Object.entries(requestMetrics.routes).map(([routeKey, metrics]) => [
      routeKey,
      {
        count: metrics.count,
        average_response_time_ms: round(
          metrics.totalResponseTimeMs / metrics.count
        ),
        max_response_time_ms: round(metrics.maxResponseTimeMs),
        last_response_time_ms: round(metrics.lastResponseTimeMs),
        last_status_code: metrics.lastStatusCode,
        status_codes: metrics.statusCodes
      }
    ])
  );
}

function getMetricsSnapshot() {
  const averageResponseTimeMs =
    requestMetrics.totalRequestsCompleted > 0
      ? requestMetrics.totalResponseTimeMs / requestMetrics.totalRequestsCompleted
      : 0;

  return {
    health: {
      status: "ok",
      service: env.serviceName,
      started_at: requestMetrics.startedAt,
      timestamp: new Date().toISOString()
    },
    uptime_seconds: round(process.uptime()),
    cpu: getCpuMetrics(),
    memory: getMemoryMetrics(),
    response_time: {
      total_requests_started: requestMetrics.totalRequestsStarted,
      total_requests_completed: requestMetrics.totalRequestsCompleted,
      active_requests: requestMetrics.activeRequests,
      average_response_time_ms: round(averageResponseTimeMs),
      max_response_time_ms: round(requestMetrics.maxResponseTimeMs),
      last_response_time_ms: round(requestMetrics.lastResponseTimeMs),
      status_codes: requestMetrics.statusCodes,
      by_route: getRouteMetricsSnapshot()
    }
  };
}

function escapeLabelValue(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("\"", "\\\"")
    .replaceAll("\n", "\\n");
}

function createMetricLine(name, value, labels = {}) {
  const normalizedValue =
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  const labelEntries = Object.entries(labels);

  if (labelEntries.length === 0) {
    return `${name} ${normalizedValue}`;
  }

  const serializedLabels = labelEntries
    .map(([key, labelValue]) => `${key}="${escapeLabelValue(labelValue)}"`)
    .join(",");

  return `${name}{${serializedLabels}} ${normalizedValue}`;
}

function getPrometheusMetrics() {
  const metrics = getMetricsSnapshot();
  const lines = [
    "# HELP driver_service_up Driver service health status.",
    "# TYPE driver_service_up gauge",
    createMetricLine("driver_service_up", 1, {
      service: metrics.health.service
    }),
    "# HELP driver_service_uptime_seconds Process uptime in seconds.",
    "# TYPE driver_service_uptime_seconds gauge",
    createMetricLine("driver_service_uptime_seconds", metrics.uptime_seconds, {
      service: metrics.health.service
    }),
    "# HELP driver_service_cpu_user_ms_total Total user CPU time in milliseconds.",
    "# TYPE driver_service_cpu_user_ms_total counter",
    createMetricLine(
      "driver_service_cpu_user_ms_total",
      metrics.cpu.user_ms,
      { service: metrics.health.service }
    ),
    "# HELP driver_service_cpu_system_ms_total Total system CPU time in milliseconds.",
    "# TYPE driver_service_cpu_system_ms_total counter",
    createMetricLine(
      "driver_service_cpu_system_ms_total",
      metrics.cpu.system_ms,
      { service: metrics.health.service }
    ),
    "# HELP driver_service_cpu_utilization_percentage Approximate CPU utilization percentage.",
    "# TYPE driver_service_cpu_utilization_percentage gauge",
    createMetricLine(
      "driver_service_cpu_utilization_percentage",
      metrics.cpu.utilization_percentage,
      { service: metrics.health.service }
    ),
    "# HELP driver_service_memory_bytes Process memory usage in bytes.",
    "# TYPE driver_service_memory_bytes gauge",
    createMetricLine("driver_service_memory_bytes", metrics.memory.rss_bytes, {
      service: metrics.health.service,
      area: "rss"
    }),
    createMetricLine(
      "driver_service_memory_bytes",
      metrics.memory.heap_total_bytes,
      {
        service: metrics.health.service,
        area: "heap_total"
      }
    ),
    createMetricLine(
      "driver_service_memory_bytes",
      metrics.memory.heap_used_bytes,
      {
        service: metrics.health.service,
        area: "heap_used"
      }
    ),
    createMetricLine(
      "driver_service_memory_bytes",
      metrics.memory.external_bytes,
      {
        service: metrics.health.service,
        area: "external"
      }
    ),
    createMetricLine(
      "driver_service_memory_bytes",
      metrics.memory.array_buffers_bytes,
      {
        service: metrics.health.service,
        area: "array_buffers"
      }
    ),
    "# HELP driver_service_requests_total Total HTTP requests observed by the driver service.",
    "# TYPE driver_service_requests_total counter",
    createMetricLine(
      "driver_service_requests_total",
      metrics.response_time.total_requests_started,
      {
        service: metrics.health.service,
        state: "started"
      }
    ),
    createMetricLine(
      "driver_service_requests_total",
      metrics.response_time.total_requests_completed,
      {
        service: metrics.health.service,
        state: "completed"
      }
    ),
    "# HELP driver_service_active_requests Current number of in-flight HTTP requests.",
    "# TYPE driver_service_active_requests gauge",
    createMetricLine(
      "driver_service_active_requests",
      metrics.response_time.active_requests,
      { service: metrics.health.service }
    ),
    "# HELP driver_service_response_time_ms Aggregated HTTP response time in milliseconds.",
    "# TYPE driver_service_response_time_ms gauge",
    createMetricLine(
      "driver_service_response_time_ms",
      metrics.response_time.average_response_time_ms,
      {
        service: metrics.health.service,
        aggregation: "average"
      }
    ),
    createMetricLine(
      "driver_service_response_time_ms",
      metrics.response_time.max_response_time_ms,
      {
        service: metrics.health.service,
        aggregation: "max"
      }
    ),
    createMetricLine(
      "driver_service_response_time_ms",
      metrics.response_time.last_response_time_ms,
      {
        service: metrics.health.service,
        aggregation: "last"
      }
    ),
    "# HELP driver_service_status_code_total Total completed requests grouped by status code.",
    "# TYPE driver_service_status_code_total counter"
  ];

  for (const [statusCode, count] of Object.entries(
    metrics.response_time.status_codes
  )) {
    lines.push(
      createMetricLine("driver_service_status_code_total", count, {
        service: metrics.health.service,
        status_code: statusCode
      })
    );
  }

  lines.push(
    "# HELP driver_service_route_requests_total Total completed requests grouped by route.",
    "# TYPE driver_service_route_requests_total counter"
  );

  for (const [route, routeMetrics] of Object.entries(
    metrics.response_time.by_route
  )) {
    lines.push(
      createMetricLine("driver_service_route_requests_total", routeMetrics.count, {
        service: metrics.health.service,
        route
      })
    );
  }

  lines.push(
    "# HELP driver_service_route_response_status_total Total completed requests grouped by route and status code.",
    "# TYPE driver_service_route_response_status_total counter"
  );

  for (const [route, routeMetrics] of Object.entries(
    metrics.response_time.by_route
  )) {
    for (const [statusCode, count] of Object.entries(routeMetrics.status_codes)) {
      lines.push(
        createMetricLine("driver_service_route_response_status_total", count, {
          service: metrics.health.service,
          route,
          status: statusCode
        })
      );
    }
  }

  lines.push(
    "# HELP driver_service_route_response_time_ms Response time aggregates in milliseconds grouped by route.",
    "# TYPE driver_service_route_response_time_ms gauge"
  );

  for (const [route, routeMetrics] of Object.entries(
    metrics.response_time.by_route
  )) {
    lines.push(
      createMetricLine(
        "driver_service_route_response_time_ms",
        routeMetrics.average_response_time_ms,
        {
          service: metrics.health.service,
          route,
          aggregation: "average"
        }
      ),
      createMetricLine(
        "driver_service_route_response_time_ms",
        routeMetrics.max_response_time_ms,
        {
          service: metrics.health.service,
          route,
          aggregation: "max"
        }
      ),
      createMetricLine(
        "driver_service_route_response_time_ms",
        routeMetrics.last_response_time_ms,
        {
          service: metrics.health.service,
          route,
          aggregation: "last"
        }
      )
    );
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  beginRequest,
  getMetricsSnapshot,
  getPrometheusMetrics
};
