const API_KEY = process.env.API_KEY;

function authMiddleware(req, res, next) {
  if (!API_KEY) return next(); // Auth disabled in dev
  const key = req.headers["x-api-key"] || req.query.apiKey;
  if (key !== API_KEY) return res.status(401).json({ success: false, error: "Unauthorized" });
  next();
}

module.exports = { authMiddleware };
