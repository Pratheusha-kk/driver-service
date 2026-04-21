const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function clearModules() {
  const modulesToClear = [
    "../src/config/env",
    "../src/db/database",
    "../src/repositories/driverRepository",
    "../src/services/driverSeedService"
  ];

  for (const modulePath of modulesToClear) {
    delete require.cache[require.resolve(modulePath)];
  }
}

function createTempCsv(filePath) {
  const csvContent = [
    "driver_id,name,phone,email,vehicle_type,vehicle_plate,is_active,city,created_at",
    "1,Asha,9876543210,asha@example.com,SUV,KA01AB1234,True,Bengaluru,2025-07-30 05:58:56",
    "2,Rahul,9876543211,rahul@example.com,Sedan,KA01AB1235,False,Hyderabad,2025-07-30 06:10:00"
  ].join("\n");

  fs.writeFileSync(filePath, csvContent);
}

test("seedDriversIfEmpty seeds drivers only once when the database starts empty", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "driver-seed-test-"));
  const dbPath = path.join(tempDir, "driver-service.db");
  const csvPath = path.join(tempDir, "ride_drivers.csv");

  createTempCsv(csvPath);

  process.env.DB_PATH = dbPath;
  process.env.SERVICE_NAME = "driver-service-seed-test";

  clearModules();

  const { seedDriversIfEmpty } = require("../src/services/driverSeedService");
  const { findDriverById, listDrivers } = require("../src/repositories/driverRepository");

  const firstRun = seedDriversIfEmpty(csvPath);
  const secondRun = seedDriversIfEmpty(csvPath);
  const drivers = listDrivers();

  assert.equal(firstRun.seeded, true);
  assert.equal(firstRun.createdCount, 2);
  assert.equal(firstRun.skippedCount, 0);
  assert.equal(secondRun.seeded, false);
  assert.equal(secondRun.reason, "database_not_empty");
  assert.equal(drivers.length, 2);
  assert.equal(findDriverById(1).name, "Asha");
  assert.equal(findDriverById(2).is_active, false);

  fs.rmSync(tempDir, { recursive: true, force: true });
});
