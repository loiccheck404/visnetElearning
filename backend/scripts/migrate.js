const db = require("../config/database");
const fs = require("fs");
const path = require("path");

async function runMigrations() {
  try {
    console.log("Running database migrations...");

    const schemaSQL = fs.readFileSync(
      path.join(__dirname, "../config/schema.sql"),
      "utf8"
    );
    await db.query(schemaSQL);
    console.log("✓ Users schema created");

    const coursesSQL = fs.readFileSync(
      path.join(__dirname, "../config/courses-schema.sql"),
      "utf8"
    );
    await db.query(coursesSQL);
    console.log("✓ Courses schema created");

    const studentActivitiesSQL = fs.readFileSync(
      path.join(__dirname, "../config/student-activities-schema.sql"),
      "utf8"
    );
    await db.query(studentActivitiesSQL);
    console.log("✓ Student activities schema created");

    console.log("All migrations completed successfully!");
    return true; // ← Changed from process.exit(0)
  } catch (error) {
    console.error("Migration failed:", error);
    throw error; // ← Changed from process.exit(1)
  }
}

module.exports = runMigrations; // ← Added export