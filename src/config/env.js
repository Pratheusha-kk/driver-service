const path = require("node:path");

const env = {
  port: Number.parseInt(process.env.PORT || "3003", 10),
  serviceName: process.env.SERVICE_NAME || "driver-service",
  dbPath: process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(process.cwd(), "data", "driver-service.db")
};

module.exports = { env };
