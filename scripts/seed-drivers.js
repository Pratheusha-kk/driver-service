const fs = require("node:fs");
const path = require("node:path");
const { createDriver } = require("../src/repositories/driverRepository");

const DEFAULT_DATASET_PATH = path.join(
  process.cwd(),
  "RIDE Dataset",
  "ride_drivers.csv"
);

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
        is_active: record.is_active === "True"
      });
      createdCount += 1;
    } catch (error) {
      skippedCount += 1;
    }
  }

  console.log(
    JSON.stringify({
      message: "Driver seed completed",
      createdCount,
      skippedCount
    })
  );
}

const csvPath = process.argv[2] || process.env.DRIVER_DATASET_PATH || DEFAULT_DATASET_PATH;

try {
  seedDrivers(csvPath);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
