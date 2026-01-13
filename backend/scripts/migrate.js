const db = require("../config/database");
const fs = require("fs");
const path = require("path");

async function runMigrations() {
  try {
    console.log("Running database migrations...");

    // STEP 1: Create users table FIRST (no dependencies)
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, "../config/schema.sql"),
      "utf8"
    );

    await db.query(schemaSQL);
    console.log("✓ Users schema created");

    // STEP 2: Create courses tables SECOND (depends on users)
    const coursesSQL = fs.readFileSync(
      path.join(__dirname, "../config/courses-schema.sql"),
      "utf8"
    );

    await db.query(coursesSQL);
    console.log("✓ Courses schema created");

    // STEP 3: Create student_activities table LAST (depends on both users and courses)
    const studentActivitiesSQL = fs.readFileSync(
      path.join(__dirname, "../config/student-activities-schema.sql"),
      "utf8"
    );

    await db.query(studentActivitiesSQL);
    console.log("✓ Student activities schema created");

    console.log("All migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
