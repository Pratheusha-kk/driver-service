const {
  getDefaultDriverDatasetPath,
  seedDrivers
} = require("../src/services/driverSeedService");

const csvPath =
  process.argv[2] || process.env.DRIVER_DATASET_PATH || getDefaultDriverDatasetPath();

try {
  const result = seedDrivers(csvPath);
  console.log(
    JSON.stringify({
      message: "Driver seed completed",
      createdCount: result.createdCount,
      skippedCount: result.skippedCount,
      datasetPath: result.datasetPath
    })
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
