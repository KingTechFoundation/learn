const mysql = require('mysql');
require('dotenv').config();

// MySQL configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10, // For pooling
};

// Create a MySQL connection pool
const db = mysql.createPool(dbConfig);

// Function to ensure the table is created
const createUsersTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      profile_pic VARCHAR(255),
      is_admin BOOLEAN DEFAULT 0,
      is_online BOOLEAN DEFAULT 0,
      is_verified BOOLEAN DEFAULT 0,
      verification_token VARCHAR(255),
      reset_token VARCHAR(255),
      reset_token_expiration DATETIME,
      failed_login_attempts INT DEFAULT 0,
      account_locked BOOLEAN DEFAULT 0,
      subscription_type VARCHAR(50),
      subscription_end_date DATETIME,
      language_preference VARCHAR(20),
      timezone VARCHAR(50),
      last_login_at DATETIME,
      last_password_change DATETIME,
      email_notifications BOOLEAN DEFAULT 1,
      sms_notifications BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_online_at DATETIME
    );
  `;

  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table created or already exists.');
    }
  });
};

// Initialize connection and create table
const initializeDatabase = () => {
  db.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to the database:', err.stack);
      return;
    }
    console.log('Connected to the database.');
    createUsersTable(); // Ensure the table exists
    connection.release(); // Release the connection back to the pool
  });

  // Handle errors in the connection pool
  db.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection lost. Reconnecting...');
      initializeDatabase();
    }
  });
};

// Initialize database
initializeDatabase();

module.exports = db;
