const { database } = require("../db/database");

function mapDriver(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    license_number: row.license_number,
    vehicle_type: row.vehicle_type,
    vehicle_model: row.vehicle_model,
    vehicle_plate: row.vehicle_plate,
    city: row.city,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function createDriver(driver) {
  const now = driver.created_at || new Date().toISOString();
  const insertDriver = database.prepare(`
    INSERT INTO drivers (
      id, name, phone, email, license_number, vehicle_type, vehicle_model,
      vehicle_plate, city, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertHistory = database.prepare(`
    INSERT INTO driver_status_history (driver_id, is_active, reason, changed_at)
    VALUES (?, ?, ?, ?)
  `);

  database.exec("BEGIN");

  try {
    const result = insertDriver.run(
      driver.id,
      driver.name,
      driver.phone,
      driver.email,
      driver.license_number,
      driver.vehicle_type,
      driver.vehicle_model,
      driver.vehicle_plate,
      driver.city,
      driver.is_active ? 1 : 0,
      now,
      now
    );

    insertHistory.run(
      driver.id || result.lastInsertRowid,
      driver.is_active ? 1 : 0,
      "driver_onboarded",
      now
    );
    database.exec("COMMIT");

    return findDriverById(Number(driver.id || result.lastInsertRowid));
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function findDriverById(id) {
  const statement = database.prepare(`
    SELECT id, name, phone, email, license_number, vehicle_type,
           vehicle_model, vehicle_plate, city, is_active, created_at, updated_at
    FROM drivers
    WHERE id = ?
  `);

  return mapDriver(statement.get(id));
}

function listDrivers(filters = {}) {
  const whereParts = [];
  const values = [];

  if (filters.is_active !== undefined) {
    whereParts.push("is_active = ?");
    values.push(filters.is_active ? 1 : 0);
  }

  if (filters.city) {
    whereParts.push("city = ?");
    values.push(filters.city);
  }

  if (filters.vehicle_type) {
    whereParts.push("vehicle_type = ?");
    values.push(filters.vehicle_type);
  }

  const whereClause =
    whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
  const limitClause = filters.limit ? "LIMIT ?" : "";

  if (filters.limit) {
    values.push(filters.limit);
  }

  const statement = database.prepare(`
    SELECT id, name, phone, email, license_number, vehicle_type,
           vehicle_model, vehicle_plate, city, is_active, created_at, updated_at
    FROM drivers
    ${whereClause}
    ORDER BY id ASC
    ${limitClause}
  `);

  return statement.all(...values).map(mapDriver);
}

function updateDriverStatus(id, isActive, reason) {
  const now = new Date().toISOString();
  const updateStatement = database.prepare(`
    UPDATE drivers
    SET is_active = ?, updated_at = ?
    WHERE id = ?
  `);
  const historyStatement = database.prepare(`
    INSERT INTO driver_status_history (driver_id, is_active, reason, changed_at)
    VALUES (?, ?, ?, ?)
  `);

  database.exec("BEGIN");

  try {
    const result = updateStatement.run(isActive ? 1 : 0, now, id);
    if (result.changes === 0) {
      database.exec("ROLLBACK");
      return null;
    }

    historyStatement.run(
      id,
      isActive ? 1 : 0,
      reason || "status_updated",
      now
    );
    database.exec("COMMIT");

    return findDriverById(id);
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function updateDriver(id, driver) {
  const now = new Date().toISOString();
  const existingDriver = findDriverById(id);

  if (!existingDriver) {
    return null;
  }

  const updateStatement = database.prepare(`
    UPDATE drivers
    SET name = ?, phone = ?, email = ?, license_number = ?, vehicle_type = ?,
        vehicle_model = ?, vehicle_plate = ?, city = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `);
  const historyStatement = database.prepare(`
    INSERT INTO driver_status_history (driver_id, is_active, reason, changed_at)
    VALUES (?, ?, ?, ?)
  `);

  database.exec("BEGIN");

  try {
    updateStatement.run(
      driver.name,
      driver.phone,
      driver.email,
      driver.license_number,
      driver.vehicle_type,
      driver.vehicle_model,
      driver.vehicle_plate,
      driver.city,
      driver.is_active ? 1 : 0,
      now,
      id
    );

    if (existingDriver.is_active !== driver.is_active) {
      historyStatement.run(
        id,
        driver.is_active ? 1 : 0,
        "driver_updated",
        now
      );
    }

    database.exec("COMMIT");
    return findDriverById(id);
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function getDriverStatusHistory(id) {
  const statement = database.prepare(`
    SELECT is_active, reason, changed_at
    FROM driver_status_history
    WHERE driver_id = ?
    ORDER BY changed_at DESC
  `);

  return statement.all(id).map((row) => ({
    is_active: Boolean(row.is_active),
    reason: row.reason,
    changed_at: row.changed_at
  }));
}

module.exports = {
  createDriver,
  findDriverById,
  getDriverStatusHistory,
  listDrivers,
  updateDriver,
  updateDriverStatus
};
