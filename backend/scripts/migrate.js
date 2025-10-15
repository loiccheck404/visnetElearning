const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    
    // Read schema.sql
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, '../migrations/schema.sql'),
      'utf8'
    );
    
    await db.query(schemaSQL);
    console.log('✓ Users schema created');
    
    // Read courses-schema.sql
    const coursesSQL = fs.readFileSync(
      path.join(__dirname, '../migrations/courses-schema.sql'),
      'utf8'
    );
    
    await db.query(coursesSQL);
    console.log('✓ Courses schema created');
    
    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();