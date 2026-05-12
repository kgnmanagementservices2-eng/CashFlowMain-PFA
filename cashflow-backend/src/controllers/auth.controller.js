const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db"); // Assuming db.js is moved to config/

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 1. Find user in the database
    const userQuery = `SELECT * FROM public.users WHERE email = $1 AND is_active = true`;
    const { rows } = await db.query(userQuery, [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];

    // 2. Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3. Generate JWT Token
    // We include the role and market so middlewares can use them without querying the DB again
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      market: user.assigned_market,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "7d", // Production standard: expire tokens
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        market: user.assigned_market,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
};

module.exports = { login };
