// Simple request logger middleware
function requestLogger(req, res, next) {
  // Silence console logs during automated test runs
  if (process.env.NODE_ENV !== "test") {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${req.method} ${req.originalUrl || req.url}`);
  }
  next();
}

module.exports = {
  requestLogger,
};
