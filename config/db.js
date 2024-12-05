const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'musinguziverelian23',
  database: 'learning_db',
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
    return;
  }
  console.log('Connected to the database.');

  const createUsersTable = `
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

  db.query(createUsersTable, (err, result) => {
    if (err) {
      console.error('Error creating users table:', err.stack);
    } else {
      console.log('Users table created or already exists.');
    }
  });
});

module.exports = db;
