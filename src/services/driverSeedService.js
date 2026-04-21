const fs = require("node:fs");
const path = require("node:path");
const { database } = require("../db/database");
const { createDriver } = require("../repositories/driverRepository");
const { log } = require("../utils/logger");

function getDefaultDriverDatasetPath() {
  return path.join(process.cwd(), "RIDE Dataset", "ride_drivers.csv");
}

function parseCsv(content) {
  const rows = [];
  let current = "";
  let row = [];
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === "\"") {
      if (insideQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
      }

      current = "";
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const [header, ...dataRows] = rows;
  return dataRows.map((dataRow) =>
    header.reduce((record, key, position) => {
      record[key] = dataRow[position];
      return record;
    }, {})
  );
}

function validateDriverDataset(records, resolvedPath) {
  const firstRecord = records[0];

  if (!firstRecord) {
    throw new Error(`CSV file is empty: ${resolvedPath}`);
  }

  if ("rider_id" in firstRecord) {
    throw new Error(
      [
        `The file at ${resolvedPath} looks like rider data, not driver data.`,
        "Driver Service expects ride_drivers.csv with columns like driver_id, vehicle_type, vehicle_plate, and is_active."
      ].join(" ")
    );
  }

  const requiredColumns = [
    "driver_id",
    "name",
    "phone",
    "email",
    "vehicle_type",
    "vehicle_plate",
    "is_active",
    "city",
    "created_at"
  ];

  const missingColumns = requiredColumns.filter(
    (columnName) => !(columnName in firstRecord)
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `CSV file ${resolvedPath} is missing required columns: ${missingColumns.join(", ")}`
    );
  }
}

function normalizeCreatedAt(value) {
  if (!value) {
    return null;
  }

  const normalized = value.includes(" ") ? value.replace(" ", "T") : value;
  const date = new Date(`${normalized}Z`);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function seedDrivers(csvPath) {
  const resolvedPath = path.resolve(csvPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`CSV file not found: ${resolvedPath}`);
  }

  const content = fs.readFileSync(resolvedPath, "utf8");
  const records = parseCsv(content);
  validateDriverDataset(records, resolvedPath);

  let createdCount = 0;
  let skippedCount = 0;

  for (const record of records) {
    try {
      createDriver({
        id: Number.parseInt(record.driver_id, 10),
        name: record.name,
        phone: record.phone,
        email: record.email,
        license_number: null,
        vehicle_type: record.vehicle_type,
        vehicle_model: null,
        vehicle_plate: record.vehicle_plate,
        city: record.city,
        created_at: normalizeCreatedAt(record.created_at),
        is_active: String(record.is_active).toLowerCase() === "true"
      });
      createdCount += 1;
    } catch (error) {
      skippedCount += 1;
    }
  }

  return {
    datasetPath: resolvedPath,
    createdCount,
    skippedCount
  };
}

function getDriverCount() {
  const statement = database.prepare("SELECT COUNT(*) AS count FROM drivers");
  const row = statement.get();
  return row?.count || 0;
}

function seedDriversIfEmpty(csvPath = getDefaultDriverDatasetPath()) {
  const existingDrivers = getDriverCount();

  if (existingDrivers > 0) {
    log("info", "Driver seed skipped because database already has drivers", {
      existingDrivers
    });
    return {
      seeded: false,
      reason: "database_not_empty",
      existingDrivers
    };
  }

  const result = seedDrivers(csvPath);

  log("info", "Driver seed completed during service startup", {
    datasetPath: result.datasetPath,
    createdCount: result.createdCount,
    skippedCount: result.skippedCount
  });

  return {
    seeded: true,
    ...result
  };
}

module.exports = {
  getDefaultDriverDatasetPath,
  parseCsv,
  seedDrivers,
  seedDriversIfEmpty
};
