const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: `postgresql://myuser:mypassword@localhost:5432/mydb`,
});

async function migrate() {
  const files = fs.readdirSync(path.join(__dirname, 'sql')).sort();

  for (const file of files) {
    if (file.endsWith('.sql')) {
      const filePath = path.join(__dirname, 'sql', file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Executing migration file: ${file}`);
      await pool.query(sql);
    }
  }

  console.log('All migrations completed successfully!');
}

async function seed() {
  const passwordHash = await bcrypt.hash('mypassword', 10);
  const insertQuery = `
    INSERT INTO users (username, password_hash)
    VALUES ($1, $2);
  `;
  const values = ['myuser', passwordHash];
  await pool.query(insertQuery, values);
  console.log('Initial test data added successfully!');
}

async function run() {
  try {
    await migrate();
    await seed();
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }

}

run();
