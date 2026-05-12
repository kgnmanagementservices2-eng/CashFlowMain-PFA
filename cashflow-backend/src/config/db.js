const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || "")
    ? false
    : { rejectUnauthorized: false },
});

pool
  .query("SELECT NOW()")
  .then((r) => {
    console.log("DB connected at", r.rows[0].now);
  })
  .catch((err) => {
    console.error("DB connect error:", err.message);
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
