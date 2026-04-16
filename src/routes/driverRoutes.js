const express = require("express");
const {
  createDriverHandler,
  getDriverHandler,
  listDriversHandler,
  updateDriverStatusHandler
} = require("../controllers/driverController");

const router = express.Router();

router.get("/", listDriversHandler);
router.post("/", createDriverHandler);
router.get("/:id", getDriverHandler);
router.patch("/:id/status", updateDriverStatusHandler);

module.exports = { driverRouter: router };
