const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { env } = require("../config/env");

function initializeDatabase() {
  fs.mkdirSync(path.dirname(env.dbPath), { recursive: true });

  const db = new DatabaseSync(env.dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      license_number TEXT UNIQUE,
      vehicle_type TEXT NOT NULL,
      vehicle_model TEXT,
      vehicle_plate TEXT NOT NULL UNIQUE,
      city TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_drivers_active_city
      ON drivers (is_active, city);

    CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_type
      ON drivers (vehicle_type);

    CREATE TABLE IF NOT EXISTS driver_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL,
      is_active INTEGER NOT NULL,
      reason TEXT,
      changed_at TEXT NOT NULL,
      FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
    );
  `);

  return db;
}

const database = initializeDatabase();

module.exports = { database };
