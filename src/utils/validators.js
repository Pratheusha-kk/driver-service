const { HttpError } = require("./httpError");

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeBoolean(value, fieldName) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true" || value === "TRUE") {
    return true;
  }

  if (value === "false" || value === "FALSE") {
    return false;
  }

  throw new HttpError(400, `${fieldName} must be a boolean.`);
}

function validateDriverPayload(payload) {
  const requiredFields = [
    "name",
    "phone",
    "email",
    "vehicle_type",
    "vehicle_plate",
    "city"
  ];

  for (const field of requiredFields) {
    if (!isNonEmptyString(payload[field])) {
      throw new HttpError(400, `${field} is required.`);
    }
  }

  if (!/^\S+@\S+\.\S+$/.test(payload.email)) {
    throw new HttpError(400, "email must be valid.");
  }

  if (!/^\d{10,15}$/.test(payload.phone)) {
    throw new HttpError(400, "phone must contain 10 to 15 digits.");
  }

  if (payload.id !== undefined && payload.id !== null) {
    const parsedId = Number.parseInt(payload.id, 10);
    if (Number.isNaN(parsedId) || parsedId < 1) {
      throw new HttpError(400, "id must be a positive integer when provided.");
    }
  }

  return {
    id:
      payload.id === undefined || payload.id === null
        ? null
        : Number.parseInt(payload.id, 10),
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    email: payload.email.trim().toLowerCase(),
    license_number: isNonEmptyString(payload.license_number)
      ? payload.license_number.trim()
      : null,
    vehicle_type: payload.vehicle_type.trim(),
    vehicle_model: isNonEmptyString(payload.vehicle_model)
      ? payload.vehicle_model.trim()
      : null,
    vehicle_plate: payload.vehicle_plate.trim().toUpperCase(),
    city: payload.city.trim(),
    created_at: isNonEmptyString(payload.created_at)
      ? payload.created_at.trim()
      : null,
    is_active:
      payload.is_active === undefined
        ? false
        : normalizeBoolean(payload.is_active, "is_active")
  };
}

function validateStatusPayload(payload) {
  if (payload.is_active === undefined) {
    throw new HttpError(400, "is_active is required.");
  }

  const status = normalizeBoolean(payload.is_active, "is_active");

  return {
    is_active: status,
    reason: isNonEmptyString(payload.reason) ? payload.reason.trim() : null
  };
}

function parseListFilters(query) {
  const filters = {};

  if (query.is_active !== undefined) {
    filters.is_active = normalizeBoolean(query.is_active, "is_active");
  }

  if (isNonEmptyString(query.city)) {
    filters.city = query.city.trim();
  }

  if (isNonEmptyString(query.vehicle_type)) {
    filters.vehicle_type = query.vehicle_type.trim();
  }

  if (query.limit !== undefined) {
    const limit = Number.parseInt(query.limit, 10);
    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      throw new HttpError(400, "limit must be between 1 and 100.");
    }
    filters.limit = limit;
  }

  return filters;
}

module.exports = {
  parseListFilters,
  validateDriverPayload,
  validateStatusPayload
};
