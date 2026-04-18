const {
  changeDriverStatus,
  fetchDriver,
  fetchDrivers,
  onboardDriver,
  updateDriverProfile
} = require("../services/driverService");
const {
  parseListFilters,
  validateDriverPayload,
  validateDriverUpdatePayload,
  validateStatusPayload
} = require("../utils/validators");
const { HttpError } = require("../utils/httpError");

function parseDriverId(value) {
  const driverId = Number.parseInt(value, 10);
  if (Number.isNaN(driverId) || driverId < 1) {
    throw new HttpError(400, "driver id must be a positive integer.");
  }

  return driverId;
}

function createDriverHandler(req, res) {
  const payload = validateDriverPayload(req.body);
  const driver = onboardDriver(payload);

  res.status(201).json({
    message: "Driver created successfully.",
    data: driver
  });
}

function getDriverHandler(req, res) {
  const driverId = parseDriverId(req.params.id);
  const driver = fetchDriver(driverId);

  res.json({
    data: driver
  });
}

function listDriversHandler(req, res) {
  const filters = parseListFilters(req.query);
  const drivers = fetchDrivers(filters);

  res.json({
    count: drivers.length,
    data: drivers
  });
}

function updateDriverStatusHandler(req, res) {
  const driverId = parseDriverId(req.params.id);
  const payload = validateStatusPayload(req.body);
  const driver = changeDriverStatus(driverId, payload);

  res.json({
    message: "Driver status updated successfully.",
    data: driver
  });
}

function updateDriverHandler(req, res) {
  const driverId = parseDriverId(req.params.id);
  const payload = validateDriverUpdatePayload(req.body);
  const driver = updateDriverProfile(driverId, payload);

  res.json({
    message: "Driver updated successfully.",
    data: driver
  });
}

module.exports = {
  createDriverHandler,
  getDriverHandler,
  listDriversHandler,
  updateDriverHandler,
  updateDriverStatusHandler
};
