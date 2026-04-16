const { log } = require("../utils/logger");

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const response = {
    error: err.name || "Error",
    message: err.message || "Something went wrong.",
    correlationId: req.correlationId
  };

  if (err.details) {
    response.details = err.details;
  }

  log("error", "Request failed", {
    correlationId: req.correlationId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    error: err.message
  });

  res.status(statusCode).json(response);
}

module.exports = { errorHandler };
