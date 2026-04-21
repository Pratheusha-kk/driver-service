const { app } = require("./app");
const { env } = require("./config/env");
const { getDefaultDriverDatasetPath, seedDriversIfEmpty } = require("./services/driverSeedService");
const { log } = require("./utils/logger");

try {
  seedDriversIfEmpty(process.env.DRIVER_DATASET_PATH || getDefaultDriverDatasetPath());
} catch (error) {
  log("error", "Driver seed failed during service startup", {
    error: error.message
  });
}

app.listen(env.port, () => {
  log("info", "Driver service started", {
    service: env.serviceName,
    port: env.port
  });
});
