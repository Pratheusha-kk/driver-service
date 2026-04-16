const {
  createDriver,
  findDriverById,
  getDriverStatusHistory,
  listDrivers,
  updateDriverStatus
} = require("../repositories/driverRepository");
const { HttpError } = require("../utils/httpError");

function ensureDriverExists(driverId) {
  const driver = findDriverById(driverId);
  if (!driver) {
    throw new HttpError(404, `Driver with id ${driverId} was not found.`);
  }

  return driver;
}

function handleDatabaseError(error) {
  if (
    typeof error.message === "string" &&
    error.message.includes("UNIQUE constraint failed")
  ) {
    const columnName = error.message.split(".").pop();
    throw new HttpError(409, `${columnName} already exists.`);
  }

  throw error;
}

function onboardDriver(driverPayload) {
  try {
    return createDriver(driverPayload);
  } catch (error) {
    handleDatabaseError(error);
  }
}

function fetchDriver(driverId) {
  const driver = ensureDriverExists(driverId);
  return {
    ...driver,
    status_history: getDriverStatusHistory(driverId)
  };
}

function fetchDrivers(filters) {
  return listDrivers(filters);
}

function changeDriverStatus(driverId, statusPayload) {
  ensureDriverExists(driverId);

  try {
    return updateDriverStatus(
      driverId,
      statusPayload.is_active,
      statusPayload.reason
    );
  } catch (error) {
    handleDatabaseError(error);
  }
}

module.exports = {
  changeDriverStatus,
  fetchDriver,
  fetchDrivers,
  onboardDriver
};
