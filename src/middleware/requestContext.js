const { randomUUID } = require("node:crypto");
const { log } = require("../utils/logger");

function requestContext(req, res, next) {
  const correlationId = req.header("x-correlation-id") || randomUUID();

  req.correlationId = correlationId;
  res.setHeader("x-correlation-id", correlationId);

  const startedAt = Date.now();
  log("info", "Request received", {
    correlationId,
    method: req.method,
    path: req.originalUrl
  });

  res.on("finish", () => {
    log("info", "Request completed", {
      correlationId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });

  next();
}

module.exports = { requestContext };
