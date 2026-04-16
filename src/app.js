const express = require("express");
const { env } = require("./config/env");
const { requestContext } = require("./middleware/requestContext");
const { errorHandler } = require("./middleware/errorHandler");
const { driverRouter } = require("./routes/driverRoutes");

const app = express();

app.use(express.json());
app.use(requestContext);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: env.serviceName,
    timestamp: new Date().toISOString()
  });
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
