-- NeoBank Database Schema
-- Run this file to initialize the database

CREATE DATABASE IF NOT EXISTS neobank;
USE neobank;

-- Users table (passwords stored in plain text intentionally)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  role ENUM('user', 'admin') DEFAULT 'user',
  balance DECIMAL(10,2) DEFAULT 1000.00,
  account_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description VARCHAR(255),
  type ENUM('credit', 'debit') DEFAULT 'debit',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Admin notes table (contains flags)
CREATE TABLE IF NOT EXISTS admin_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Server logs table
CREATE TABLE IF NOT EXISTS server_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(255),
  user_id INT,
  ip VARCHAR(50),
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  time VARCHAR(255),
  ip VARCHAR(255),
  event VARCHAR(255),
  detail JSON
);

-- Seed admin user
INSERT INTO users (username, password, email, role, balance, account_number) VALUES
('admin', 'admin123', 'admin@neobank.io', 'admin', 99999.99, 'NEO-0000-ADMIN'),
('alice', 'password123', 'alice@example.com', 'user', 5420.50, 'NEO-1001-ALICE');

-- Seed transactions
INSERT INTO transactions (user_id, amount, description, type) VALUES
(2, 5000.00, 'Initial deposit', 'credit'),
(2, 200.00, 'Netflix subscription', 'debit'),
(2, 1500.00, 'Salary credit', 'credit'),
(2, 879.50, 'Amazon purchase', 'debit'),
(3, 1000.00, 'Initial deposit', 'credit'),
(3, 679.25, 'Grocery store', 'debit'),
(4, 15000.00, 'Wire transfer in', 'credit'),
(4, 2200.00, 'Rent payment', 'debit'),
(1, 50000.00, 'Admin fund allocation', 'credit');

-- Seed admin notes (FLAGS HERE)
INSERT INTO admin_notes (note) VALUES
('System initialized. Internal access only.'),
('flag{sql_injection_master_0x1337}'),
('TODO: Fix the login endpoint - currently vulnerable to SQLi. Dev said it will be patched next sprint.'),
('Backup credentials: root / toor. Do not share.'),
('flag{you_found_the_secret_table}'),
('Meeting notes: Security audit scheduled for Q3. Known issues: JWT secret is weak, session handling needs work.');

-- Seed server logs
INSERT INTO server_logs (action, user_id, ip, details) VALUES
('LOGIN_SUCCESS', 1, '192.168.1.1', 'Admin logged in from internal network'),
('LOGIN_FAILED', NULL, '45.33.32.156', 'Multiple failed attempts - possible brute force'),
('TRANSFER', 2, '192.168.1.45', 'Transfer of $200 to external account'),
('ADMIN_ACCESS', 1, '192.168.1.1', 'Admin accessed user management panel'),
('FLAG_HINT', NULL, '127.0.0.1', 'flag{check_the_logs_carefully}');
