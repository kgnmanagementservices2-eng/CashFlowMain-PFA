// // createAdmin.js
// require("dotenv").config();
// const bcrypt = require("bcrypt");
// const { Pool } = require("pg");

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false },
// });

// async function createAdminUser() {
//   try {
//     const fullName = "System Admin";
//     const email = "admin@yourdomain.com"; // Change this
//     const plainPassword = "SuperSecretPassword123!"; // Change this
//     const role = "admin";

//     // Hash the password (10 salt rounds is standard)
//     const saltRounds = 10;
//     const passwordHash = await bcrypt.hash(plainPassword, saltRounds);

//     const query = `
//       INSERT INTO public.users (full_name, email, password_hash, role, is_active)
//       VALUES ($1, $2, $3, $4, true)
//       RETURNING id, email, role;
//     `;

//     const { rows } = await pool.query(query, [
//       fullName,
//       email,
//       passwordHash,
//       role,
//     ]);

//     console.log("✅ Admin user created successfully:", rows[0]);
//   } catch (error) {
//     console.error("❌ Error creating admin:", error.message);
//   } finally {
//     pool.end();
//   }
// }

// createAdminUser();
require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

// Connect directly to your DB using the URL in your .env file
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for AWS RDS / Neon / Supabase
});

// The master password for all test accounts
const STANDARD_PASSWORD = "Password123!";

// The list of users to create
const testUsers = [
  // {
  //   email: "admin@s3retail.com",
  //   fullName: "Master Admin",
  //   role: "admin",
  //   market: null,
  // },
  // {
  //   email: "austin@s3retail.com",
  //   fullName: "Austin Manager",
  //   role: "market_manager",
  //   market: "Austin",
  // },
  // {
  //   email: "vegas@s3retail.com",
  //   fullName: "Vegas Manager",
  //   role: "market_manager",
  //   market: "Las Vegas",
  // },
  // {
  //   email: "expense@s3retail.com",
  //   fullName: "Expense Auditor",
  //   role: "expense_commission_manager",
  //   market: null,
  // },
  // {
  //   email: "payroll@s3retail.com",
  //   fullName: "Payroll Auditor",
  //   role: "payroll_manager",
  //   market: null,
  // },
  // {
  //   email: "expense@s3retail.com",
  //   fullName: "Expense Auditor",
  //   role: "expense_manager", // <--- CHANGED THIS
  //   market: null,
  // },
  {
    email: "corpus@s3retail.com",
    fullName: "Corpus Manager",
    role: "market_manager",
    market: "Corpus Christi",
  },
];

async function seedDatabase() {
  try {
    console.log("Starting Database Seeding...");

    // Generate the secure hash once since they all share the same password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(STANDARD_PASSWORD, saltRounds);

    for (const user of testUsers) {
      // Use ON CONFLICT DO NOTHING so it doesn't crash if you run the script twice
      const sql = `
        INSERT INTO public.users (email, password_hash, full_name, role, assigned_market)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
        RETURNING *;
      `;

      const values = [
        user.email,
        hashedPassword,
        user.fullName,
        user.role,
        user.market,
      ];
      const { rows } = await pool.query(sql, values);

      if (rows.length > 0) {
        console.log(`✅ Created user: ${user.email} (${user.role})`);
      } else {
        console.log(`⚠️ User already exists: ${user.email}`);
      }
    }

    console.log("\n🎉 All test users are ready!");
    console.log(`🔑 The password for ALL accounts is: ${STANDARD_PASSWORD}\n`);
  } catch (err) {
    console.error("❌ Error seeding database:", err);
  } finally {
    pool.end(); // Close the connection so the script exits automatically
  }
}

seedDatabase();
