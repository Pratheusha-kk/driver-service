const express = require("express");
const { env } = require("./config/env");
const { requestContext } = require("./middleware/requestContext");
const { metricsMiddleware } = require("./middleware/metrics");
const { errorHandler } = require("./middleware/errorHandler");
const {
  getMetricsSnapshot,
  getPrometheusMetrics
} = require("./metrics/serviceMetrics");
const { driverRouter } = require("./routes/driverRoutes");

const app = express();

app.use(express.json());
app.use(metricsMiddleware);
app.use(requestContext);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: env.serviceName,
    timestamp: new Date().toISOString(),
    uptime_seconds: Number(process.uptime().toFixed(2))
  });
});

app.get("/metrics", (req, res) => {
  res.json(getMetricsSnapshot());
});

app.get("/metrics/prometheus", (req, res) => {
  res.type("text/plain; version=0.0.4; charset=utf-8");
  res.send(getPrometheusMetrics());
});

app.use("/v1/drivers", driverRouter);

app.use((req, res) => {
  res.status(404).json({
    error: "NotFound",
    message: "Route not found.",
    correlationId: req.correlationId
  });
});

app.use(errorHandler);

module.exports = { app };
