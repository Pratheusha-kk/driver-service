function log(level, message, context = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };

  console.log(JSON.stringify(entry));
}

module.exports = { log };
