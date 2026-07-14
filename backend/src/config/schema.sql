CREATE DATABASE IF NOT EXISTS queen_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE queen_tracker;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(40) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    avatar VARCHAR(255) NULL,
    role ENUM('pcelar', 'admin') DEFAULT 'pcelar',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hive Types table
CREATE TABLE IF NOT EXISTS hive_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Queen Breeds table
CREATE TABLE IF NOT EXISTS queen_breeds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hive table
CREATE TABLE IF NOT EXISTS hives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    hive_type_id INT NOT NULL,
    apiary_name VARCHAR(80) NOT NULL,
    location VARCHAR(255) NOT NULL,
    note TEXT NULL,
    owner_id INT NOT NULL,
    is_archived TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hive_type_id) REFERENCES hive_types(id),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_hive_code_owner (code, owner_id)
);

-- Queen table
CREATE TABLE IF NOT EXISTS queens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    queen_code VARCHAR(50) NOT NULL,
    breed_id INT NOT NULL,
    birth_year INT NOT NULL,
    marking_color ENUM('bela', 'zuta', 'crvena', 'zelena', 'plava', 'neoznacena') NOT NULL,
    origin ENUM('kupljena', 'rojena', 'selekcionisana', 'nepoznato') NOT NULL,
    status ENUM('aktivna', 'uginula', 'prodata') DEFAULT 'aktivna',
    note TEXT NULL,
    owner_id INT NOT NULL,
    is_archived TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (breed_id) REFERENCES queen_breeds(id),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_queen_code_owner (queen_code, owner_id)
);

-- Queen Hive Assignments table
CREATE TABLE IF NOT EXISTS queen_hive_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    queen_id INT NOT NULL,
    hive_id INT NOT NULL,
    assigned_at DATE NOT NULL,
    ended_at DATE NULL,
    assignment_status ENUM('aktivna', 'zavrsena') DEFAULT 'aktivna',
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (queen_id) REFERENCES queens(id) ON DELETE CASCADE,
    FOREIGN KEY (hive_id) REFERENCES hives(id) ON DELETE CASCADE
);

-- Queen Quality Checks table
CREATE TABLE IF NOT EXISTS queen_quality_checks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    check_date DATE NOT NULL,
    is_queen_seen TINYINT(1) NOT NULL DEFAULT 1,
    are_eggs_seen TINYINT(1) NOT NULL DEFAULT 1,
    brood_score INT NOT NULL, -- 1-5
    laying_score INT NOT NULL, -- 1-5
    temperament_score INT NOT NULL, -- 1-5
    productivity_score INT NOT NULL, -- 1-5
    health_score INT NOT NULL, -- 1-5
    total_score DECIMAL(3,2) NOT NULL,
    recommendation ENUM('zadrzati', 'pratiti', 'zameniti', 'hitno_zameniti', 'dodati_novu') NOT NULL,
    note TEXT NULL,
    checked_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES queen_hive_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (checked_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
