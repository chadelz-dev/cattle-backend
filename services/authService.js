// backend/services/authService.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Change from 'bcryptjs' to 'bcrypt'
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const login = async (name, password) => {
  const result = await pool.query(
    'SELECT id, name, password_hash FROM farmer_details WHERE name = $1',
    [name]
  );
  if (!result.rows.length) throw new Error('Farmer not found');
  const farmer = result.rows[0];
  const valid = await bcrypt.compare(password, farmer.password_hash);
  if (!valid) throw new Error('Invalid password');
  const token = jwt.sign(
    { id: farmer.id, name: farmer.name },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  return { token };
};

module.exports = { login };
