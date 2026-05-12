const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // Verify token and extract payload
    const decodedUser = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to the request object
    req.user = decodedUser;

    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    return res.status(403).json({ error: "Invalid or expired token." });
  }
}

module.exports = { authenticateToken };
