const { app } = require("./app");
const { env } = require("./config/env");
const { log } = require("./utils/logger");

app.listen(env.port, () => {
  log("info", "Driver service started", {
    service: env.serviceName,
    port: env.port
  });
});
